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
      throw new ForbiddenException('인증 정보 또는 그룹 ID가 없습니다.');
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
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다.');
    }

    // OWNER 역할인지 확인
    if (member.role.name !== 'OWNER') {
      throw new ForbiddenException(
        '그룹 OWNER 권한이 필요합니다. 현재 역할: ' + member.role.name,
      );
    }

    return true;
  }
}
