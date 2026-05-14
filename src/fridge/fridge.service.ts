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
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import { HistoryQueryDto } from './dto/history-query.dto';

@Injectable()
export class FridgeService {
  constructor(private prisma: PrismaService) {}

  // ── 그룹 멤버 검증 ───────────────────────────────────────────

  /**
   * 그룹 멤버 여부 확인
   */
  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('그룹 멤버만 접근할 수 있습니다');
  }

  // ── StorageLocation ──────────────────────────────────────────

  /**
   * 보관소 목록 조회
   */
  async getStorages(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.storageLocation.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 보관소 생성
   */
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

  /**
   * 보관소 수정
   */
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

  /**
   * 보관소 삭제
   */
  async deleteStorage(userId: string, groupId: string, storageId: string) {
    await this.assertMember(userId, groupId);
    const storage = await this.prisma.storageLocation.findFirst({
      where: { id: storageId, groupId },
    });
    if (!storage) throw new NotFoundException('보관소를 찾을 수 없습니다');
    await this.prisma.storageLocation.delete({ where: { id: storageId } });
    return { message: '보관소가 삭제되었습니다' };
  }

  /**
   * 보관소 순서 변경
   */
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

  /**
   * 냉장고 전체 품목 조회 (보관소별 그룹핑)
   */
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

  /**
   * 냉장고 품목 등록
   */
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

  /**
   * 냉장고 품목 수정
   */
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

  /**
   * 냉장고 품목 삭제
   */
  async deleteFridgeItem(userId: string, groupId: string, itemId: string) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.fridgeItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');
    await this.prisma.fridgeItem.delete({ where: { id: itemId } });
    return { message: '품목이 삭제되었습니다' };
  }

  /**
   * 수량 변경 + 소진 시 자동 카트 등재 트리거
   */
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
    if (dto.quantity === 0 && item.frequentItem && item.frequentItem.autoAdd) {
      const cart = await this.getOrCreateCart(groupId);
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

  /**
   * 자주 사는 항목 목록 조회
   */
  async getFrequentItems(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.frequentItem.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 자주 사는 항목 생성
   */
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

  /**
   * 자주 사는 항목 수정
   */
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

  /**
   * 자주 사는 항목 삭제
   */
  async deleteFrequentItem(userId: string, groupId: string, itemId: string) {
    await this.assertMember(userId, groupId);
    const item = await this.prisma.frequentItem.findFirst({
      where: { id: itemId, groupId },
    });
    if (!item) throw new NotFoundException('자주 사는 항목을 찾을 수 없습니다');
    await this.prisma.frequentItem.delete({ where: { id: itemId } });
    return { message: '자주 사는 항목이 삭제되었습니다' };
  }

  /**
   * 자주 사는 항목 순서 변경
   */
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

  // ── ShoppingCart ─────────────────────────────────────────────

  /**
   * 활성 카트 조회 또는 생성 (내부 헬퍼)
   */
  private async getOrCreateCart(groupId: string) {
    return this.prisma.shoppingCart.upsert({
      where: { groupId },
      create: { groupId },
      update: {},
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /**
   * 장바구니 조회
   */
  async getCart(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.getOrCreateCart(groupId);
  }

  /**
   * 장바구니 품목 추가
   */
  async addCartItem(userId: string, groupId: string, dto: AddCartItemDto) {
    await this.assertMember(userId, groupId);
    const cart = await this.getOrCreateCart(groupId);
    return this.prisma.shoppingCartItem.create({
      data: {
        cartId: cart.id,
        frequentItemId: dto.frequentItemId,
        name: dto.name,
        quantity: dto.quantity,
        unit: dto.unit,
        memo: dto.memo,
      },
    });
  }

  /**
   * 장바구니 품목 수정
   */
  async updateCartItem(
    userId: string,
    groupId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const cart = await this.prisma.shoppingCart.findUnique({
      where: { groupId },
    });
    if (!cart) throw new NotFoundException('장바구니를 찾을 수 없습니다');
    const item = await this.prisma.shoppingCartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');
    return this.prisma.shoppingCartItem.update({
      where: { id: itemId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.isChecked !== undefined && { isChecked: dto.isChecked }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  /**
   * 장바구니 품목 삭제
   */
  async removeCartItem(userId: string, groupId: string, itemId: string) {
    await this.assertMember(userId, groupId);
    const cart = await this.prisma.shoppingCart.findUnique({
      where: { groupId },
    });
    if (!cart) throw new NotFoundException('장바구니를 찾을 수 없습니다');
    const item = await this.prisma.shoppingCartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('품목을 찾을 수 없습니다');
    await this.prisma.shoppingCartItem.delete({ where: { id: itemId } });
    return { message: '품목이 삭제되었습니다' };
  }

  /**
   * 장보기 완료 처리 — 아카이빙 + 냉장고 이관
   */
  async completeShopping(
    userId: string,
    groupId: string,
    dto: CompleteShoppingDto,
  ) {
    await this.assertMember(userId, groupId);
    const cart = await this.prisma.shoppingCart.findUnique({
      where: { groupId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('장바구니가 비어 있습니다');
    }

    const transferMap = new Map(dto.transfers.map((t) => [t.cartItemId, t]));

    return this.prisma.$transaction(async (tx) => {
      // 1. ShoppingHistory 생성
      const history = await tx.shoppingHistory.create({
        data: { groupId },
      });

      // 2. 각 품목 처리
      await Promise.all(
        cart.items.map(async (ci) => {
          const transfer = transferMap.get(ci.id);
          let fridgeItemId: string | null = null;

          if (transfer) {
            // 냉장고 이관
            const created = await tx.fridgeItem.create({
              data: {
                groupId,
                storageLocationId: transfer.storageLocationId,
                name: ci.name,
                quantity: transfer.quantity ?? ci.quantity,
                unit: transfer.unit ?? ci.unit,
                frequentItemId: ci.frequentItemId,
                expiresAt: transfer.expiresAt
                  ? new Date(transfer.expiresAt)
                  : undefined,
                alertDaysBefore: transfer.alertDaysBefore ?? 3,
              },
            });
            fridgeItemId = created.id;
          }

          await tx.shoppingHistoryItem.create({
            data: {
              historyId: history.id,
              name: ci.name,
              quantity: ci.quantity,
              unit: ci.unit,
              transferredToFridge: !!transfer,
              fridgeItemId,
            },
          });
        }),
      );

      // 3. 가계부 연동 (expense 필드가 있을 때만)
      if (dto.expense) {
        const today = new Date().toISOString().slice(0, 10);
        await tx.expense.create({
          data: {
            groupId,
            userId,
            type: 'EXPENSE',
            amount: dto.expense.amount,
            category: dto.expense.category ?? 'FOOD',
            date: new Date(dto.expense.date ?? today),
            description: dto.expense.description ?? '장보기',
            paymentMethod: dto.expense.paymentMethod,
            shoppingHistoryId: history.id,
          },
        });
      }

      // 4. 카트 품목 초기화
      await tx.shoppingCartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.shoppingHistory.findUnique({
        where: { id: history.id },
        include: { items: true, expense: true },
      });
    });
  }

  // ── ShoppingHistory ──────────────────────────────────────────

  /**
   * 구매 이력 목록 조회 (페이지네이션)
   */
  async getHistories(userId: string, groupId: string, query: HistoryQueryDto) {
    await this.assertMember(userId, groupId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.shoppingHistory.findMany({
        where: { groupId },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
        include: { items: true, expense: true },
      }),
      this.prisma.shoppingHistory.count({ where: { groupId } }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * 구매 이력 상세 조회
   */
  async getHistory(userId: string, groupId: string, historyId: string) {
    await this.assertMember(userId, groupId);
    const history = await this.prisma.shoppingHistory.findFirst({
      where: { id: historyId, groupId },
      include: { items: true, expense: true },
    });
    if (!history) throw new NotFoundException('구매 이력을 찾을 수 없습니다');
    return history;
  }
}
