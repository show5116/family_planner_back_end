import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionCode } from '@prisma/client';

/**
 * 그룹 권한 확인을 위한 메타데이터 키
 */
export const REQUIRED_PERMISSION = 'requiredPermission';

/**
 * 필요한 권한을 설정하는 데코레이터
 * @param permission - 필요한 권한 코드
 */
export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION, permission);

/**
 * 그룹 권한 확인 Guard
 * - 특정 그룹에서 사용자가 필요한 권한을 가지고 있는지 확인
 * - URL 파라미터에서 groupId를 추출하여 확인
 * - @RequirePermission 데코레이터로 필요한 권한 지정
 */
@Injectable()
export class GroupPermissionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<PermissionCode>(
      REQUIRED_PERMISSION,
      context.getHandler(),
    );

    if (!requiredPermission) {
      throw new Error(
        'GroupPermissionGuard를 사용하려면 @RequirePermission 데코레이터가 필요합니다.',
      );
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    // groupId를 params (groupId 또는 id), body, query 순서로 확인
    const groupId =
      request.params?.groupId ||
      request.params?.id ||
      request.body?.groupId ||
      request.query?.groupId;

    if (!userId || !groupId) {
      throw new ForbiddenException('인증 정보 또는 그룹 ID가 없습니다.');
    }

    // 그룹 멤버십 조회 (역할 및 권한 포함)
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다.');
    }

    // 역할의 권한 목록 확인
    const permissions = member.role.permissions as PermissionCode[];

    // 필요한 권한이 있는지 확인
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        `이 작업을 수행하려면 '${requiredPermission}' 권한이 필요합니다. 현재 역할: ${member.role.name}`,
      );
    }

    return true;
  }
}
