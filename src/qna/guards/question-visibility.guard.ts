import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionVisibility } from '../enums/question-visibility.enum';

/**
 * 질문 공개/비공개 권한 검증 가드
 * - 공개 질문: 모든 사용자 조회 가능
 * - 비공개 질문: 본인 또는 ADMIN만 조회 가능
 */
@Injectable()
export class QuestionVisibilityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const questionId = request.params.id;

    if (!userId || !questionId) {
      throw new ForbiddenException('권한이 없습니다');
    }

    // 질문 조회
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    // ADMIN은 모든 질문 접근 가능
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      return true;
    }

    // 공개 질문은 누구나 접근 가능
    if (question.visibility === QuestionVisibility.PUBLIC) {
      return true;
    }

    // 비공개 질문은 본인만 접근 가능
    if (question.userId === userId) {
      return true;
    }

    throw new ForbiddenException('권한이 없습니다');
  }
}
