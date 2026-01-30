import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * 카테고리 목록 조회
   * - groupId가 null인 경우: 본인 userId로 등록된 개인 카테고리만 조회
   * - groupId가 지정된 경우: 해당 그룹의 카테고리만 조회
   */
  async getCategories(userId: string, groupId?: string) {
    if (groupId) {
      const isMember = await this.checkGroupMember(userId, groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 조회할 수 있습니다');
      }

      return await this.prisma.category.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return await this.prisma.category.findMany({
      where: { userId, groupId: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 카테고리 생성
   */
  async createCategory(userId: string, dto: CreateCategoryDto) {
    if (dto.groupId) {
      const isMember = await this.checkGroupMember(userId, dto.groupId);
      if (!isMember) {
        throw new ForbiddenException(
          '그룹 멤버만 카테고리를 생성할 수 있습니다',
        );
      }
    }

    // 중복 이름 체크
    await this.checkDuplicateName(userId, dto.name, dto.groupId);

    return await this.prisma.category.create({
      data: {
        userId,
        groupId: dto.groupId || null,
        name: dto.name,
        description: dto.description || null,
        emoji: dto.emoji || null,
        color: dto.color || null,
      },
    });
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    // 권한 체크: 작성자 본인 또는 그룹 멤버
    await this.checkCategoryPermission(userId, category);

    // 이름 변경 시 중복 체크
    if (dto.name && dto.name !== category.name) {
      await this.checkDuplicateName(
        userId,
        dto.name,
        category.groupId,
        categoryId,
      );
    }

    return await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        description: dto.description,
        emoji: dto.emoji,
        color: dto.color,
      },
    });
  }

  /**
   * 카테고리 삭제
   */
  async deleteCategory(userId: string, categoryId: string) {
    // _count 사용으로 성능 최적화 (Task 전체 로드 방지)
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    // 권한 체크: 작성자 본인 또는 그룹 멤버
    await this.checkCategoryPermission(userId, category);

    // Task 개수만 체크 (메모리 효율적)
    if (category._count.tasks > 0) {
      throw new ConflictException(
        `카테고리에 연결된 Task가 ${category._count.tasks}개 있어 삭제할 수 없습니다`,
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: '카테고리가 삭제되었습니다' };
  }

  /**
   * 카테고리 수정/삭제 권한 체크
   * - 개인 카테고리: 작성자 본인만
   * - 그룹 카테고리: 작성자 본인 또는 그룹 멤버
   */
  private async checkCategoryPermission(
    userId: string,
    category: { userId: string; groupId: string | null },
  ): Promise<void> {
    // 작성자 본인이면 OK
    if (category.userId === userId) {
      return;
    }

    // 그룹 카테고리인 경우 그룹 멤버이면 OK
    if (category.groupId) {
      const isMember = await this.checkGroupMember(userId, category.groupId);
      if (isMember) {
        return;
      }
      throw new ForbiddenException(
        '그룹 멤버만 카테고리를 수정/삭제할 수 있습니다',
      );
    }

    // 개인 카테고리인데 작성자가 아닌 경우
    throw new ForbiddenException(
      '본인이 작성한 카테고리만 수정/삭제할 수 있습니다',
    );
  }

  /**
   * 중복 이름 체크
   * - 개인 카테고리: 본인의 개인 카테고리 내에서 중복 체크
   * - 그룹 카테고리: 해당 그룹 내에서 중복 체크
   */
  private async checkDuplicateName(
    userId: string,
    name: string,
    groupId?: string | null,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        name,
        ...(groupId
          ? { groupId } // 그룹 카테고리: 같은 그룹 내
          : { userId, groupId: null }), // 개인 카테고리: 본인 것 중
        ...(excludeCategoryId ? { id: { not: excludeCategoryId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `같은 이름의 카테고리가 이미 존재합니다: ${name}`,
      );
    }
  }

  /**
   * 그룹 멤버 확인
   */
  private async checkGroupMember(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });
    return !!member;
  }
}
