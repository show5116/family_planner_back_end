import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 운영자(isAdmin=true) 권한 확인 Guard
 * JwtAuthGuard와 함께 사용해야 함
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // 사용자 정보 조회
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { isAdmin: true },
    });

    if (!dbUser || !dbUser.isAdmin) {
      throw new ForbiddenException('운영자 권한이 필요합니다.');
    }

    return true;
  }
}
