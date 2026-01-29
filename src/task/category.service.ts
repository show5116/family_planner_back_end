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

    if (category.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 카테고리만 수정할 수 있습니다',
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
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { tasks: true },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 카테고리만 삭제할 수 있습니다',
      );
    }

    if (category.tasks.length > 0) {
      throw new ConflictException(
        '카테고리에 연결된 Task가 있어 삭제할 수 없습니다',
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: '카테고리가 삭제되었습니다' };
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
