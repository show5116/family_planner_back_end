import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * 유통기한 프리셋 전체 조회 (글로벌 기본값 + 그룹 커스텀 오버라이드 머지)
   * 카테고리+보관유형 조합별로 커스텀이 있으면 커스텀값, 없으면 글로벌 기본값 반환
   * keywords는 클라이언트 로컬 매칭용 (글로벌 항목에만 존재, 커스텀 전용 항목은 null)
   */
  async getPresets(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);

    const [globalPresets, groupPresets] = await Promise.all([
      this.prisma.globalExpiryPreset.findMany({
        orderBy: [{ category: 'asc' }, { storageType: 'asc' }],
      }),
      this.prisma.groupExpiryPreset.findMany({ where: { groupId } }),
    ]);

    const groupPresetMap = new Map(
      groupPresets.map((gp) => [`${gp.category}_${gp.storageType}`, gp]),
    );

    // 카테고리+보관유형 조합 기준으로 글로벌 키워드 목록 집계
    const globalKeywordsByKey = new Map<string, string[]>();
    for (const gp of globalPresets) {
      const key = `${gp.category}_${gp.storageType}`;
      const existing = globalKeywordsByKey.get(key) ?? [];
      existing.push(gp.keyword);
      globalKeywordsByKey.set(key, existing);
    }

    // 카테고리+보관유형 조합 기준으로 글로벌 대표값(defaultDays) 추출
    const globalByKey = new Map<string, (typeof globalPresets)[number]>();
    for (const gp of globalPresets) {
      const key = `${gp.category}_${gp.storageType}`;
      if (!globalByKey.has(key)) globalByKey.set(key, gp);
    }

    // 글로벌 + 그룹 커스텀 합집합 키
    const allKeys = new Set([...globalByKey.keys(), ...groupPresetMap.keys()]);

    return [...allKeys].map((key) => {
      const global = globalByKey.get(key);
      const custom = groupPresetMap.get(key);
      const [category, storageType] = custom
        ? [custom.category, custom.storageType]
        : [global.category, global.storageType];
      return {
        category,
        storageType,
        days: custom?.customDays ?? global.defaultDays,
        keywords: globalKeywordsByKey.get(key) ?? null,
        isCustom: !!custom,
        customPresetId: custom?.id ?? null,
      };
    });
  }

  /**
   * 그룹별 카테고리 커스텀 프리셋 upsert
   * 저장 후 머지된 프리셋 형태로 반환
   */
  async upsertGroupPreset(userId: string, dto: UpsertGroupExpiryPresetDto) {
    await this.assertMember(userId, dto.groupId);
    const saved = await this.prisma.groupExpiryPreset.upsert({
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
    return {
      category: saved.category,
      storageType: saved.storageType,
      days: saved.customDays,
      keywords: null,
      isCustom: true,
      customPresetId: saved.id,
    };
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
