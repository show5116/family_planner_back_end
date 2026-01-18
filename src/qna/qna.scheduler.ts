import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionStatus } from './enums/question-status.enum';

/**
 * Q&A 스케줄러
 * - ANSWERED 상태가 1주일 지속되면 자동으로 RESOLVED로 변경
 */
@Injectable()
export class QnaScheduler {
  private readonly logger = new Logger(QnaScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ANSWERED 상태 자동 해결완료 처리 (매일 자정)
   * ANSWERED 상태로 1주일 이상 경과한 질문을 RESOLVED로 변경
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoResolveOldAnsweredQuestions() {
    this.logger.log('ANSWERED 상태 자동 해결완료 처리 시작');

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const result = await this.prisma.question.updateMany({
        where: {
          status: QuestionStatus.ANSWERED,
          updatedAt: {
            lt: oneWeekAgo,
          },
          deletedAt: null,
        },
        data: {
          status: QuestionStatus.RESOLVED,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `${result.count}개의 질문이 자동 해결완료 처리되었습니다`,
        );
      } else {
        this.logger.log('자동 해결완료 처리할 질문 없음');
      }
    } catch (error) {
      this.logger.error('자동 해결완료 처리 실패', error);
    }
  }
}
