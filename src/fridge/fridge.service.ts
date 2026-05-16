import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateFridgeItemDto } from './dto/create-fridge-item.dto';
import { UpdateFridgeItemDto } from './dto/update-fridge-item.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { CreateFrequentItemDto } from './dto/create-frequent-item.dto';
import { UpdateFrequentItemDto } from './dto/update-frequent-item.dto';
import { BulkCreateFridgeItemDto } from './dto/bulk-create-fridge-item.dto';

@Injectable()
export class FridgeService {
  constructor(private prisma: PrismaService) {}

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('그룹 멤버만 접근할 수 있습니다');
  }

  // ── StorageLocation ──────────────────────────────────────────

  async getStorages(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.storageLocation.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createStorage(userId: string, groupId: string, dto: CreateStorageDto) {
    await this.assertMember(userId, groupId);
    const maxOrder = await this.prisma.storageLocation.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });
    return this.prisma.storageLocation.create({
      data: {
        groupId,
        name: dto.name,
        type: dto.type as any,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateStorage(
    userId: string,
    groupId: string,
    storageId: string,
    dto: UpdateStorageDto,
  ) {
    await this.assertMember(userId, groupId);
    const storage = await this.prisma.storageLocation.findFirst({
      where: { id: storageId, groupId },
    });
    if (!storage) throw new NotFoundException('보관소를 찾을 수 없습니다');
    return this.prisma.storageLocation.update({
      where: { id: storageId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type as any }),
      },
    });
  }

  async deleteStorage(userId: string, groupId: string, storageId: string) {
    await this.assertMember(userId, groupId);
    const storage = await this.prisma.storageLocation.findFirst({
      where: { id: storageId, groupId },
    });
    if (!storage) throw new NotFoundException('보관소를 찾을 수 없습니다');
    await this.prisma.storageLocation.delete({ where: { id: storageId } });
    return { message: '보관소가 삭제되었습니다' };
  }

  async reorderStorages(userId: string, groupId: string, dto: ReorderDto) {
    await this.assertMember(userId, groupId);
    await Promise.all(
      dto.ids.map((id, index) =>
        this.prisma.storageLocation.updateMany({
          where: { id, groupId },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.storageLocation.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── FridgeItem ───────────────────────────────────────────────

  async getFridgeItems(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.storageLocation.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createFridgeItem(
    userId: string,
    groupId: string,
    dto: CreateFridgeItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const storage = await this.prisma.storageLocation.findFirst({
      where: { id: dto.storageLocationId, groupId },
    });
    if (!storage) throw new NotFoundException('보관소를 찾을 수 없습니다');
    return this.prisma.fridgeItem.create({
      data: {
        groupId,
        storageLocationId: dto.storageLocationId,
        name: dto.name,
        quantity: dto.quantity,
        unit: dto.unit,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        alertDaysBefore: dto.alertDaysBefore ?? 3,
        memo: dto.memo,
        frequentItemId: dto.frequentItemId,
      },
    });
  }

  async bulkCreateFridgeItems(
    userId: string,
    groupId: string,
    dto: BulkCreateFridgeItemDto,
  ) {
    await this.assertMember(userId, groupId);

    const storageIds = [...new Set(dto.items.map((i) => i.storageLocationId))];
    const storages = await this.prisma.storageLocation.findMany({
      where: { id: { in: storageIds }, groupId },
    });
    if (storages.length !== storageIds.length) {
      throw new NotFoundException('일부 보관소를 찾을 수 없습니다');
    }

    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.fridgeItem.create({
          data: {
            groupId,
            storageLocationId: item.storageLocationId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
            alertDaysBefore: item.alertDaysBefore ?? 3,
            memo: item.memo,
            frequentItemId: item.frequentItemId,
          },
        }),
      ),
    );
  }

  async updateFridgeItem(
    userId: string,
    groupId: string,
    itemId: string,
    dto: UpdateFridgeItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');

    if (dto.storageLocationId) {
      const storage = await this.prisma.storageLocation.findFirst({
        where: { id: dto.storageLocationId, groupId },
      });
      if (!storage) throw new NotFoundException('보관소를 찾을 수 없습니다');
    }

    return this.prisma.fridgeItem.update({
      where: { id: itemId },
      data: {
        ...(dto.storageLocationId && {
          storageLocationId: dto.storageLocationId,
        }),
        ...(dto.name && { name: dto.name }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
        ...(dto.alertDaysBefore !== undefined && {
          alertDaysBefore: dto.alertDaysBefore,
        }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...(dto.frequentItemId !== undefined && {
          frequentItemId: dto.frequentItemId,
        }),
      },
    });
  }

  async deleteFridgeItem(userId: string, groupId: string, itemId: string) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');
    await this.prisma.fridgeItem.delete({ where: { id: itemId } });
    return { message: '품목이 삭제되었습니다' };
  }

  async updateQuantity(
    userId: string,
    groupId: string,
    itemId: string,
    dto: UpdateQuantityDto,
  ) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, groupId },
      include: { frequentItem: true },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');

    const updated = await this.prisma.fridgeItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    // 소진 트리거: 수량 0 + 자주 사는 항목 + autoAdd 활성화
    if (dto.quantity === 0 && item.frequentItem?.autoAdd) {
      const cart = await this.prisma.shoppingCart.upsert({
        where: { groupId },
        create: { groupId },
        update: {},
      });
      const exists = await this.prisma.shoppingCartItem.findFirst({
        where: { cartId: cart.id, frequentItemId: item.frequentItemId },
      });
      if (!exists) {
        await this.prisma.shoppingCartItem.create({
          data: {
            cartId: cart.id,
            frequentItemId: item.frequentItemId,
            name: item.frequentItem.name,
            quantity: 1,
            unit: item.frequentItem.defaultUnit,
          },
        });
      }
    }

    return updated;
  }

  // ── FrequentItem ─────────────────────────────────────────────

  async getFrequentItems(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.frequentItem.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createFrequentItem(
    userId: string,
    groupId: string,
    dto: CreateFrequentItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const maxOrder = await this.prisma.frequentItem.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });
    return this.prisma.frequentItem.create({
      data: {
        groupId,
        name: dto.name,
        defaultUnit: dto.defaultUnit,
        autoAdd: dto.autoAdd ?? false,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateFrequentItem(
    userId: string,
    groupId: string,
    itemId: string,
    dto: UpdateFrequentItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.frequentItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('자주 사는 항목을 찾을 수 없습니다');
    return this.prisma.frequentItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.defaultUnit !== undefined && { defaultUnit: dto.defaultUnit }),
        ...(dto.autoAdd !== undefined && { autoAdd: dto.autoAdd }),
      },
    });
  }

  async deleteFrequentItem(userId: string, groupId: string, itemId: string) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.frequentItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('자주 사는 항목을 찾을 수 없습니다');
    await this.prisma.frequentItem.delete({ where: { id: itemId } });
    return { message: '자주 사는 항목이 삭제되었습니다' };
  }

  async reorderFrequentItems(userId: string, groupId: string, dto: ReorderDto) {
    await this.assertMember(userId, groupId);
    await Promise.all(
      dto.ids.map((id, index) =>
        this.prisma.frequentItem.updateMany({
          where: { id, groupId },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.frequentItem.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
