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

  async getPresets(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);

    const [globalPresets, groupPresets] = await Promise.all([
      this.prisma.globalExpiryPreset.findMany({
        orderBy: [
          { category: 'asc' },
          { storageType: 'asc' },
          { keyword: 'asc' },
        ],
      }),
      this.prisma.groupExpiryPreset.findMany({ where: { groupId } }),
    ]);

    const groupPresetMap = new Map(
      groupPresets.map((gp) => [gp.globalPresetId, gp]),
    );

    return globalPresets.map((global) => {
      const custom = groupPresetMap.get(global.id);
      return {
        globalPresetId: global.id,
        category: global.category,
        keyword: global.keyword,
        storageType: global.storageType,
        days: custom?.customDays ?? global.defaultDays,
        isCustom: !!custom,
        customPresetId: custom?.id ?? null,
      };
    });
  }

  async upsertGroupPreset(userId: string, dto: UpsertGroupExpiryPresetDto) {
    await this.assertMember(userId, dto.groupId);

    const global = await this.prisma.globalExpiryPreset.findUnique({
      where: { id: dto.globalPresetId },
    });
    if (!global) throw new NotFoundException('fridge.errors.preset_not_found');

    const saved = await this.prisma.groupExpiryPreset.upsert({
      where: {
        groupId_globalPresetId: {
          groupId: dto.groupId,
          globalPresetId: dto.globalPresetId,
        },
      },
      update: { customDays: dto.customDays },
      create: {
        groupId: dto.groupId,
        globalPresetId: dto.globalPresetId,
        customDays: dto.customDays,
      },
    });

    return {
      globalPresetId: global.id,
      category: global.category,
      keyword: global.keyword,
      storageType: global.storageType,
      days: saved.customDays,
      isCustom: true,
      customPresetId: saved.id,
    };
  }

  async deleteGroupPreset(userId: string, groupId: string, presetId: string) {
    await this.assertMember(userId, groupId);
    const preset = await this.prisma.groupExpiryPreset.findFirst({
      where: { id: presetId, groupId },
    });
    if (!preset) throw new NotFoundException('fridge.errors.preset_not_found');
    await this.prisma.groupExpiryPreset.delete({ where: { id: presetId } });
  }
}
