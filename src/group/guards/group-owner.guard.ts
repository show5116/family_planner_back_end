import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * 그룹 OWNER 권한 확인 Guard
 * - 특정 그룹의 OWNER 역할을 가진 사용자만 접근 가능
 * - URL 파라미터에서 groupId를 추출하여 확인
 */
@Injectable()
export class GroupOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const groupId = request.params?.groupId;

    if (!userId || !groupId) {
      throw new ForbiddenException('group.errors.no_auth_or_group_id');
    }

    // 그룹 멤버십 조회
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
      throw new ForbiddenException('group.errors.no_access');
    }

    // OWNER 역할인지 확인
    if (member.role.name !== 'OWNER') {
      throw new ForbiddenException('group.errors.owner_required');
    }

    return true;
  }
}
