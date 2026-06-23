import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('auth.errors.unauthorized');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { isSuperAdmin: true },
    });

    if (!dbUser || !dbUser.isSuperAdmin) {
      throw new ForbiddenException('auth.errors.super_admin_required');
    }

    return true;
  }
}
