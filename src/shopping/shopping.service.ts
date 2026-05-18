import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { BulkAddCartItemDto } from './dto/bulk-add-cart-item.dto';
import { BulkUpdateCartItemDto } from './dto/bulk-update-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import { HistoryQueryDto } from './dto/history-query.dto';

@Injectable()
export class ShoppingService {
  constructor(private prisma: PrismaService) {}

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('그룹 멤버만 접근할 수 있습니다');
  }

  private async getOrCreateCart(groupId: string) {
    return this.prisma.shoppingCart.upsert({
      where: { groupId },
      create: { groupId },
      update: {},
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // ── ShoppingCart ─────────────────────────────────────────────

  async getCart(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.getOrCreateCart(groupId);
  }

  async addCartItem(userId: string, groupId: string, dto: AddCartItemDto) {
    await this.assertMember(userId, groupId);
    const cart = await this.getOrCreateCart(groupId);
    const frequent = await this.prisma.frequentItem.findUnique({
      where: { groupId_name: { groupId, name: dto.name } },
    });
    return this.prisma.shoppingCartItem.create({
      data: {
        cartId: cart.id,
        frequentItemId: frequent?.id,
        name: dto.name,
        quantity: dto.quantity,
        unit: dto.unit,
        memo: dto.memo,
      },
    });
  }

  async bulkAddCartItems(
    userId: string,
    groupId: string,
    dto: BulkAddCartItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const cart = await this.getOrCreateCart(groupId);
    const allNames = dto.items.map((i) => i.name);
    const frequentItems = await this.prisma.frequentItem.findMany({
      where: { groupId, name: { in: allNames } },
    });
    const frequentMap = new Map(frequentItems.map((f) => [f.name, f.id]));
    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.shoppingCartItem.create({
          data: {
            cartId: cart.id,
            frequentItemId: frequentMap.get(item.name),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            memo: item.memo,
          },
        }),
      ),
    );
  }

  async bulkUpdateCartItems(
    userId: string,
    groupId: string,
    dto: BulkUpdateCartItemDto,
  ) {
    await this.assertMember(userId, groupId);
    const cart = await this.prisma.shoppingCart.findUnique({
      where: { groupId },
    });
    if (!cart) throw new NotFoundException('장바구니를 찾을 수 없습니다');

    const updates = dto.updates ?? [];
    const deletes = dto.deletes ?? [];

    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const item = await tx.shoppingCartItem.findFirst({
          where: { id: u.id, cartId: cart.id },
        });
        if (!item) continue;
        await tx.shoppingCartItem.update({
          where: { id: u.id },
          data: {
            ...(u.quantity !== undefined && { quantity: u.quantity }),
            ...(u.unit !== undefined && { unit: u.unit }),
            ...(u.isChecked !== undefined && { isChecked: u.isChecked }),
            ...(u.memo !== undefined && { memo: u.memo }),
          },
        });
      }

      if (deletes.length > 0) {
        await tx.shoppingCartItem.deleteMany({
          where: { id: { in: deletes }, cartId: cart.id },
        });
      }
    });

    return this.prisma.shoppingCart.findUnique({
      where: { groupId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

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

    const historyId = await this.prisma.$transaction(
      async (tx) => {
        const history = await tx.shoppingHistory.create({
          data: { groupId },
        });

        let totalPrice = 0;

        for (const ci of cart.items) {
          const transfer = transferMap.get(ci.id);
          let fridgeItemId: string | null = null;

          if (transfer) {
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

          const itemPrice = transferMap.get(ci.id)?.price ?? null;
          if (itemPrice != null) totalPrice += itemPrice;

          await tx.shoppingHistoryItem.create({
            data: {
              historyId: history.id,
              name: ci.name,
              quantity: ci.quantity,
              unit: ci.unit,
              price: itemPrice,
              transferredToFridge: !!transfer,
              fridgeItemId,
            },
          });
        }

        if (dto.expense) {
          const amount = dto.expense.amount ?? totalPrice;
          const today = new Date().toISOString().slice(0, 10);
          await tx.expense.create({
            data: {
              groupId,
              userId,
              type: 'EXPENSE',
              amount,
              category: dto.expense.category ?? 'GROCERIES',
              date: new Date(dto.expense.date ?? today),
              description: dto.expense.description ?? '장보기',
              paymentMethod: dto.expense.paymentMethod,
              shoppingHistoryId: history.id,
            },
          });
        }

        await tx.shoppingCartItem.deleteMany({ where: { cartId: cart.id } });

        return history.id;
      },
      { timeout: 30000 },
    );

    return this.prisma.shoppingHistory.findUnique({
      where: { id: historyId },
      include: { items: true, expense: true },
    });
  }

  // ── ShoppingHistory ──────────────────────────────────────────

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
