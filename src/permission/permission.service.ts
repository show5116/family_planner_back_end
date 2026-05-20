import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionCategory, PermissionCode } from '@prisma/client';
import { CreatePermissionDto } from '@/permission/dto/create-permission.dto';
import { UpdatePermissionDto } from '@/permission/dto/update-permission.dto';
import { BulkUpdatePermissionSortOrderDto } from '@/permission/dto/bulk-update-sort-order.dto';

@Injectable()
export class PermissionService {
  constructor(
    private prisma: PrismaService,
    private i18n: I18nService,
  ) {}

  /**
   * 전체 권한 목록 조회
   * @param category - 필터링할 카테고리 (optional)
   * @returns 권한 목록 (카테고리별로 그룹화)
   */
  async getAllPermissions(category?: string) {
    const where: any = {
      isActive: true, // 활성화된 권한만 조회
    };

    if (
      category &&
      Object.values(PermissionCategory).includes(category as PermissionCategory)
    ) {
      where.category = category;
    }

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
      },
    });

    // 카테고리별로 그룹화
    const groupedByCategory = permissions.reduce(
      (acc, permission) => {
        const cat = permission.category;
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(permission);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    );

    return {
      permissions,
      groupedByCategory,
      categories: Object.values(PermissionCategory),
    };
  }

  /**
   * 특정 권한 코드들이 유효한지 검증
   * @param permissionCodes - 검증할 권한 코드 배열
   * @returns 유효 여부
   */
  async validatePermissions(
    permissionCodes: PermissionCode[],
  ): Promise<boolean> {
    const validPermissions = await this.prisma.permission.findMany({
      where: {
        code: { in: permissionCodes },
        isActive: true,
      },
      select: { code: true },
    });

    return validPermissions.length === permissionCodes.length;
  }

  /**
   * 권한 코드 배열을 이름으로 변환
   * @param permissionCodes - 권한 코드 배열
   * @returns 권한 이름 배열
   */
  async getPermissionNames(
    permissionCodes: PermissionCode[],
  ): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: permissionCodes },
        isActive: true,
      },
      select: { name: true },
    });

    return permissions.map((p) => p.name);
  }

  /**
   * 권한 생성 (운영자 전용)
   * @param createPermissionDto - 생성할 권한 정보
   * @param userId - 요청자의 사용자 ID
   * @returns 생성된 권한
   */
  async createPermission(
    createPermissionDto: CreatePermissionDto,
    userId: string,
  ) {
    // 권한 코드 중복 확인
    const existingPermission = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });
    if (existingPermission) {
      throw new ConflictException('permission.errors.code_already_exists');
    }

    const permission = await this.prisma.permission.create({
      data: {
        code: createPermissionDto.code,
        name: createPermissionDto.name,
        description: createPermissionDto.description,
        category: createPermissionDto.category,
        isActive: createPermissionDto.isActive ?? true,
        sortOrder: createPermissionDto.sortOrder ?? 0,
      },
    });

    return {
      message: this.i18n.t('permission.success.created', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      permission,
    };
  }

  /**
   * 권한 수정 (운영자 전용)
   * @param id - 권한 ID
   * @param updatePermissionDto - 수정할 권한 정보
   * @param userId - 요청자의 사용자 ID
   * @returns 수정된 권한
   */
  async updatePermission(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    userId: string,
  ) {
    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('permission.errors.not_found');
    }

    // 권한 코드 변경 시 중복 확인
    if (
      updatePermissionDto.code &&
      updatePermissionDto.code !== permission.code
    ) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { code: updatePermissionDto.code },
      });

      if (existingPermission) {
        throw new ConflictException('permission.errors.code_already_exists');
      }
    }

    const updatedPermission = await this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });

    return {
      message: this.i18n.t('permission.success.updated', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      permission: updatedPermission,
    };
  }

  /**
   * 권한 삭제 (소프트 삭제 - isActive=false)
   * @param id - 권한 ID
   * @param userId - 요청자의 사용자 ID
   * @returns 삭제된 권한
   */
  async deletePermission(id: string, userId: string) {
    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('permission.errors.not_found');
    }

    // 소프트 삭제 (isActive = false)
    const deletedPermission = await this.prisma.permission.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      message: this.i18n.t('permission.success.deactivated', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      permission: deletedPermission,
    };
  }

  /**
   * 권한 완전 삭제 (하드 삭제 - DB에서 완전 제거)
   * 주의: 이 권한을 사용하는 역할이 있을 수 있으므로 신중히 사용
   * @param id - 권한 ID
   * @param userId - 요청자의 사용자 ID
   * @returns 삭제 결과
   */
  async hardDeletePermission(id: string, userId: string) {
    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('permission.errors.not_found');
    }

    // 이 권한을 사용하는 역할이 있는지 확인
    const rolesUsingPermission = await this.prisma.role.findMany({
      where: {
        permissions: {
          path: '$',
          array_contains: permission.code,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (rolesUsingPermission.length > 0) {
      throw new BadRequestException(
        `이 권한을 사용하는 ${rolesUsingPermission.length}개의 역할이 있습니다. 먼저 역할에서 권한을 제거해주세요.`,
      );
    }

    // 완전 삭제
    await this.prisma.permission.delete({
      where: { id },
    });

    return {
      message: this.i18n.t('permission.success.deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      deletedPermission: permission,
    };
  }

  // ==================== 일괄 정렬 순서 업데이트 ====================

  /**
   * 권한 일괄 정렬 순서 업데이트 (운영자 전용)
   */
  async bulkUpdateSortOrder(
    userId: string,
    bulkUpdateDto: BulkUpdatePermissionSortOrderDto,
  ) {
    // 트랜잭션으로 일괄 업데이트
    const updates = bulkUpdateDto.items.map((item) =>
      this.prisma.permission.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return {
      message: this.i18n.t('permission.success.order_updated', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      updatedCount: bulkUpdateDto.items.length,
    };
  }
}
