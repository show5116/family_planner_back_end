import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * 그룹 멤버십 확인 Guard
 * - 사용자가 특정 그룹의 멤버인지 확인
 * - URL 파라미터에서 groupId 또는 id를 추출하여 확인
 */
@Injectable()
export class GroupMembershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const groupId = request.params?.groupId || request.params?.id;

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

    // 멤버 정보를 request에 추가 (추후 사용 가능)
    request.groupMember = member;

    return true;
  }
}
