import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { WebhookService } from '@/webhook/webhook.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import { QuestionVisibility } from './enums/question-visibility.enum';
import { QuestionStatus } from './enums/question-status.enum';

@Injectable()
export class QnaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly webhookService: WebhookService,
  ) {}

  /**
   * 공개 질문 목록 조회 (PUBLIC만)
   */
  async findPublicQuestions(query: QuestionQueryDto) {
    const where: any = {
      deletedAt: null,
      visibility: QuestionVisibility.PUBLIC,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search } },
          { content: { contains: query.search } },
        ],
      }),
    };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true },
          },
          answers: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: questions.map((q) => ({
        ...q,
        content: q.content.substring(0, 100), // 미리보기 100자
        answerCount: q.answers.length,
        answers: undefined,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 내 질문 목록 조회 (공개/비공개 모두)
   */
  async findMyQuestions(userId: string, query: QuestionQueryDto) {
    const where: any = {
      userId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
    };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          answers: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: questions.map((q) => ({
        ...q,
        answerCount: q.answers.length,
        answers: undefined,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * ADMIN용 전체 질문 목록 조회
   */
  async findAllQuestionsForAdmin(query: QuestionQueryDto) {
    const where: any = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search } },
          { content: { contains: query.search } },
          { user: { name: { contains: query.search } } },
        ],
      }),
    };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          answers: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], // PENDING 우선, 최신순
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: questions.map((q) => ({
        ...q,
        answerCount: q.answers.length,
        answers: undefined,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 질문 상세 조회 (권한은 Guard에서 검증)
   */
  async findOne(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true },
        },
        answers: {
          where: { deletedAt: null },
          include: {
            admin: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    return question;
  }

  /**
   * 질문 작성 + ADMIN에게 알림 발송 + Discord 웹훅
   */
  async create(userId: string, dto: CreateQuestionDto) {
    const question = await this.prisma.question.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        visibility: dto.visibility,
        attachments: dto.attachments as any,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // 모든 ADMIN에게 알림 발송 (비동기)
    this.sendQuestionNotificationToAdmins(question).catch((err) => {
      console.error('질문 알림 발송 실패:', err);
    });

    // Discord 웹훅 발송 (비동기)
    this.webhookService
      .sendQuestionToDiscord({
        id: question.id,
        title: question.title,
        content: question.content,
        category: question.category,
        visibility: question.visibility,
        user: question.user,
      })
      .catch((err) => {
        console.error('Discord 웹훅 발송 실패:', err);
      });

    return question;
  }

  /**
   * 질문 수정 (본인만, ANSWERED/RESOLVED 상태에서는 수정 불가)
   */
  async update(id: string, userId: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    if (question.userId !== userId) {
      throw new ForbiddenException('본인 작성 질문만 수정할 수 있습니다');
    }

    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      question.status === QuestionStatus.ANSWERED ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      question.status === QuestionStatus.RESOLVED
    ) {
      throw new BadRequestException(
        '답변 완료 또는 해결 완료된 질문은 수정할 수 없습니다',
      );
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.category && { category: dto.category }),
        ...(dto.visibility && { visibility: dto.visibility }),
        ...(dto.attachments && { attachments: dto.attachments as any }),
      },
    });
  }

  /**
   * 질문 삭제 (본인만, Soft Delete)
   */
  async remove(id: string, userId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    if (question.userId !== userId) {
      throw new ForbiddenException('본인 작성 질문만 삭제할 수 있습니다');
    }

    await this.prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 질문 해결 완료 처리 (본인만, PENDING 상태에서는 불가)
   */
  async resolve(id: string, userId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    if (question.userId !== userId) {
      throw new ForbiddenException('본인 작성 질문만 해결 처리할 수 있습니다');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (question.status === QuestionStatus.PENDING) {
      throw new BadRequestException(
        '답변이 등록되지 않은 질문은 해결할 수 없습니다',
      );
    }

    return this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.RESOLVED },
    });
  }

  /**
   * 답변 작성 (ADMIN 전용) + 상태 변경 + 사용자 알림
   */
  async createAnswer(
    questionId: string,
    adminId: string,
    dto: CreateAnswerDto,
  ) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    // 트랜잭션: 답변 생성 + 질문 상태 변경
    const [answer] = await this.prisma.$transaction([
      this.prisma.answer.create({
        data: {
          questionId,
          adminId,
          content: dto.content,
          attachments: dto.attachments as any,
        },
        include: {
          admin: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.question.update({
        where: { id: questionId },
        data: { status: QuestionStatus.ANSWERED },
      }),
    ]);

    // 질문 작성자에게 알림 발송 (비동기)
    this.sendAnswerNotificationToUser(question, answer).catch((err) => {
      console.error('답변 알림 발송 실패:', err);
    });

    return answer;
  }

  /**
   * 답변 수정 (ADMIN 전용)
   */
  async updateAnswer(id: string, dto: UpdateAnswerDto) {
    const answer = await this.prisma.answer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!answer) {
      throw new NotFoundException('답변을 찾을 수 없습니다');
    }

    return this.prisma.answer.update({
      where: { id },
      data: {
        ...(dto.content && { content: dto.content }),
        ...(dto.attachments && { attachments: dto.attachments as any }),
      },
    });
  }

  /**
   * 답변 삭제 (ADMIN 전용, Soft Delete)
   */
  async removeAnswer(id: string) {
    const answer = await this.prisma.answer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!answer) {
      throw new NotFoundException('답변을 찾을 수 없습니다');
    }

    await this.prisma.answer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * ADMIN용 통계 조회
   */
  async getStatistics() {
    const [
      totalQuestions,
      pendingCount,
      answeredCount,
      resolvedCount,
      categoryStats,
      recentQuestions,
    ] = await Promise.all([
      this.prisma.question.count({ where: { deletedAt: null } }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.PENDING },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.ANSWERED },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.RESOLVED },
      }),
      this.prisma.question.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { category: true },
      }),
      this.prisma.question.findMany({
        where: { deletedAt: null },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalQuestions,
      statusStats: {
        pending: pendingCount,
        answered: answeredCount,
        resolved: resolvedCount,
      },
      categoryStats: categoryStats.map((c) => ({
        category: c.category,
        count: c._count.category,
      })),
      recentQuestions: recentQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        category: q.category,
        status: q.status,
        visibility: q.visibility,
        createdAt: q.createdAt,
        user: q.user,
      })),
    };
  }

  /**
   * ADMIN에게 새 질문 알림 발송
   */
  private async sendQuestionNotificationToAdmins(question: any) {
    // SYSTEM 알림이 켜진 모든 ADMIN 조회
    const admins = await this.prisma.user.findMany({
      where: {
        isAdmin: true,
        notificationSettings: {
          some: {
            category: NotificationCategory.SYSTEM,
            enabled: true,
          },
        },
      },
      select: { id: true },
    });

    // 배치로 알림 발송
    await Promise.allSettled(
      admins.map((admin) =>
        this.notificationService.sendNotification({
          userId: admin.id,
          category: NotificationCategory.SYSTEM,
          title: '새 질문 등록',
          body: question.title,
          data: {
            questionId: question.id,
            action: 'view_question',
          },
        }),
      ),
    );
  }

  /**
   * 질문 작성자에게 답변 알림 발송
   */
  private async sendAnswerNotificationToUser(question: any, answer: any) {
    await this.notificationService.sendNotification({
      userId: question.userId,
      category: NotificationCategory.SYSTEM,
      title: '답변이 등록되었습니다',
      body: question.title,
      data: {
        questionId: question.id,
        answerId: answer.id,
        action: 'view_answer',
      },
    });
  }
}
