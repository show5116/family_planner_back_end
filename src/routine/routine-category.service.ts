import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoutineCategoryDto } from './dto/create-routine-category.dto';
import { UpdateRoutineCategoryDto } from './dto/update-routine-category.dto';
import { ReorderRoutineCategoryDto } from './dto/reorder-routine-category.dto';
import { RoutineService } from './routine.service';

@Injectable()
export class RoutineCategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    @Inject(forwardRef(() => RoutineService))
    private readonly routineService: RoutineService,
  ) {}

  private t(key: string) {
    return this.i18n.t(`routine.${key}`, {
      lang: I18nContext.current()?.lang ?? 'ko',
    });
  }

  async create(userId: string, dto: CreateRoutineCategoryDto) {
    const sortOrder = await this.getNextSortOrder(userId);

    const category = await this.prisma.routineCategory.create({
      data: {
        userId,
        title: dto.title,
        emoji: dto.emoji,
        color: dto.color,
        sortOrder,
      },
    });

    return this.toResponse(category);
  }

  async findAll(userId: string) {
    const categories = await this.prisma.routineCategory.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return categories.map((c) => this.toResponse(c));
  }

  async findOne(userId: string, id: string) {
    const category = await this.findOwnCategory(userId, id);

    const routines = await this.routineService.findAll(userId, {
      categoryId: id,
    });

    return { ...this.toResponse(category), routines };
  }

  async update(userId: string, id: string, dto: UpdateRoutineCategoryDto) {
    await this.findOwnCategory(userId, id);

    const updated = await this.prisma.routineCategory.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    return this.toResponse(updated);
  }

  async remove(userId: string, id: string) {
    await this.findOwnCategory(userId, id);

    // 소프트 삭제라 DB ON DELETE CASCADE는 발동하지 않으므로(실제 행 삭제가 아님) 조인행을 명시적으로 제거
    await this.prisma.$transaction([
      this.prisma.routineCategoryLink.deleteMany({
        where: { categoryId: id },
      }),
      this.prisma.routineCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    return { message: this.t('success.routine_category_deleted') };
  }

  async reorder(userId: string, dto: ReorderRoutineCategoryDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.routineCategory.updateMany({
          where: { id: item.id, userId, deletedAt: null },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.findAll(userId);
  }

  private async findOwnCategory(userId: string, id: string) {
    return this.routineService.findOwnRoutineCategory(userId, id);
  }

  /** 사용자 소유 카테고리 중 현재 최댓값+1을 신규 카테고리의 정렬 순서로 반환 */
  private async getNextSortOrder(userId: string): Promise<number> {
    const result = await this.prisma.routineCategory.aggregate({
      where: { userId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? -1) + 1;
  }

  private toResponse(category: {
    id: string;
    title: string;
    emoji: string | null;
    color: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: category.id,
      title: category.title,
      emoji: category.emoji,
      color: category.color,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
