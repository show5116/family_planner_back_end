import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UpsertGroupExpiryPresetDto } from './dto/upsert-group-expiry-preset.dto';

@Injectable()
export class ExpiryPresetService {
  constructor(private prisma: PrismaService) {}

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('fridge.errors.group_member_only');
  }

  private buildSuggestion(
    preset: {
      category: string;
      keyword: string;
      storageType: StorageType;
      defaultDays: number;
    },
    overrideDays?: number,
  ) {
    const defaultDays = overrideDays ?? preset.defaultDays;
    const suggestedExpiresAt = new Date();
    suggestedExpiresAt.setDate(suggestedExpiresAt.getDate() + defaultDays);
    return {
      category: preset.category,
      keyword: preset.keyword,
      storageType: preset.storageType,
      defaultDays,
      suggestedExpiresAt: suggestedExpiresAt.toISOString(),
    };
  }

  /**
   * 품목명으로 유통기한 추천
   * - storageType 지정 시: 해당 보관 유형 단일 추천 반환
   * - storageType 미지정 시: 가능한 모든 보관 유형 추천 목록 반환 (추천 보관함 포함)
   * 우선순위: 그룹 커스텀 > 글로벌 프리셋 키워드 매칭 (가장 긴 키워드 우선)
   */
  async getSuggestions(
    userId: string,
    groupId: string,
    name: string,
    storageType?: StorageType,
  ) {
    await this.assertMember(userId, groupId);

    // 글로벌 프리셋 전체 조회 후 품목명에 키워드가 포함된 것만 필터
    const allPresets = await this.prisma.globalExpiryPreset.findMany({
      where: storageType ? { storageType } : undefined,
    });
    const matched = allPresets.filter((p) => name.includes(p.keyword));

    if (matched.length === 0) return [];

    // storageType별로 가장 긴 키워드 매칭 하나만 선택
    const bestByStorageType = new Map<StorageType, (typeof matched)[number]>();
    for (const preset of matched) {
      const existing = bestByStorageType.get(preset.storageType);
      if (!existing || preset.keyword.length > existing.keyword.length) {
        bestByStorageType.set(preset.storageType, preset);
      }
    }

    // 그룹 커스텀 오버라이드 일괄 조회
    const categories = [
      ...new Set([...bestByStorageType.values()].map((p) => p.category)),
    ];
    const groupPresets = await this.prisma.groupExpiryPreset.findMany({
      where: {
        groupId,
        category: { in: categories },
        ...(storageType ? { storageType } : {}),
      },
    });
    const groupPresetMap = new Map(
      groupPresets.map((gp) => [
        `${gp.category}_${gp.storageType}`,
        gp.customDays,
      ]),
    );

    const results = [...bestByStorageType.values()].map((preset) => {
      const overrideDays = groupPresetMap.get(
        `${preset.category}_${preset.storageType}`,
      );
      return this.buildSuggestion(preset, overrideDays);
    });

    // storageType 지정 시 단일 객체 반환, 미지정 시 목록 반환
    return storageType ? (results[0] ?? null) : results;
  }

  /**
   * 그룹별 카테고리 커스텀 프리셋 목록 조회
   */
  async getGroupPresets(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.groupExpiryPreset.findMany({
      where: { groupId },
      orderBy: [{ category: 'asc' }, { storageType: 'asc' }],
    });
  }

  /**
   * 그룹별 카테고리 커스텀 프리셋 upsert
   */
  async upsertGroupPreset(userId: string, dto: UpsertGroupExpiryPresetDto) {
    await this.assertMember(userId, dto.groupId);
    return this.prisma.groupExpiryPreset.upsert({
      where: {
        groupId_category_storageType: {
          groupId: dto.groupId,
          category: dto.category,
          storageType: dto.storageType,
        },
      },
      update: { customDays: dto.customDays },
      create: {
        groupId: dto.groupId,
        category: dto.category,
        storageType: dto.storageType,
        customDays: dto.customDays,
      },
    });
  }

  /**
   * 그룹별 카테고리 커스텀 프리셋 삭제
   */
  async deleteGroupPreset(userId: string, groupId: string, presetId: string) {
    await this.assertMember(userId, groupId);
    const preset = await this.prisma.groupExpiryPreset.findFirst({
      where: { id: presetId, groupId },
    });
    if (!preset) throw new NotFoundException('fridge.errors.preset_not_found');
    await this.prisma.groupExpiryPreset.delete({ where: { id: presetId } });
  }
}
