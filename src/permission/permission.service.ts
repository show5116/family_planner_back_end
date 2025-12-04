import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionCategory } from '@prisma/client';
import { CreatePermissionDto } from '@/permission/dto/create-permission.dto';
import { UpdatePermissionDto } from '@/permission/dto/update-permission.dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * 운영자 권한 확인 (공통 메서드)
   * @param userId - 확인할 사용자 ID
   * @throws ForbiddenException - 운영자가 아닌 경우
   */
  private async verifyAdminPermission(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      throw new ForbiddenException('운영자 권한이 필요합니다.');
    }
  }

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
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
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
  async validatePermissions(permissionCodes: string[]): Promise<boolean> {
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
  async getPermissionNames(permissionCodes: string[]): Promise<string[]> {
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
    // 운영자 권한 확인
    await this.verifyAdminPermission(userId);

    // 권한 코드 중복 확인
    const existingPermission = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });

    if (existingPermission) {
      throw new ConflictException(
        `권한 코드 '${createPermissionDto.code}'가 이미 존재합니다.`,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        code: createPermissionDto.code,
        name: createPermissionDto.name,
        description: createPermissionDto.description,
        category: createPermissionDto.category,
        isActive: createPermissionDto.isActive ?? true,
      },
    });

    return {
      message: '권한이 생성되었습니다.',
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
    // 운영자 권한 확인
    await this.verifyAdminPermission(userId);

    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('권한을 찾을 수 없습니다.');
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
        throw new ConflictException(
          `권한 코드 '${updatePermissionDto.code}'가 이미 존재합니다.`,
        );
      }
    }

    const updatedPermission = await this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });

    return {
      message: '권한이 수정되었습니다.',
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
    // 운영자 권한 확인
    await this.verifyAdminPermission(userId);

    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('권한을 찾을 수 없습니다.');
    }

    // 소프트 삭제 (isActive = false)
    const deletedPermission = await this.prisma.permission.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      message: '권한이 비활성화되었습니다.',
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
    // 운영자 권한 확인
    await this.verifyAdminPermission(userId);

    // 권한 존재 확인
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('권한을 찾을 수 없습니다.');
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
      message: '권한이 완전히 삭제되었습니다.',
      deletedPermission: permission,
    };
  }
}
