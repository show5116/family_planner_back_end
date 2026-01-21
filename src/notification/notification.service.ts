import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseService } from '@/firebase/firebase.service';
import { RedisService } from '@/redis/redis.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ScheduleNotificationDto } from './dto/schedule-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationCategory } from './enums/notification-category.enum';
import { NotificationTokenService } from './notification-token.service';
import { NotificationQueueService } from './notification-queue.service';
import { FcmTopic } from './enums/fcm-topic.enum';

/**
 * 알림 발송 관리 서비스
 * 알림 전송, 히스토리 조회, 읽음 처리 등
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private redis: RedisService,
    private tokenService: NotificationTokenService,
    private queueService: NotificationQueueService,
  ) {}

  /**
   * 알림 전송 (즉시 발송 - Queue 기반)
   */
  async sendNotification(dto: SendNotificationDto) {
    // Queue에 추가 (Worker가 비동기로 처리)
    await this.queueService.enqueueImmediate({
      userId: dto.userId,
      category: dto.category,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });

    return {
      queued: true,
      message: 'Notification queued for immediate delivery',
    };
  }

  /**
   * 예약 알림 전송 (Queue 기반)
   */
  async scheduleNotification(dto: ScheduleNotificationDto) {
    // Waiting Room에 추가 (Worker가 시간되면 Ready Queue로 이동)
    await this.queueService.enqueueScheduled({
      userId: dto.userId,
      category: dto.category,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      scheduledTime: dto.scheduledTime,
    });

    return {
      queued: true,
      scheduledTime: dto.scheduledTime,
      message: 'Notification scheduled successfully',
    };
  }

  /**
   * 알림 전송 (Legacy - 즉시 발송, Queue 미사용)
   * @deprecated Queue 기반 sendNotification() 사용 권장
   */
  async sendNotificationDirect(dto: SendNotificationDto) {
    try {
      // 1. 사용자의 알림 설정 확인
      const setting = await this.prisma.notificationSetting.findUnique({
        where: {
          userId_category: {
            userId: dto.userId,
            category: dto.category as any,
          },
        },
      });

      // 알림이 비활성화되어 있으면 전송하지 않음
      if (setting && !setting.enabled) {
        this.logger.log(
          `Notification skipped for user ${dto.userId} - category ${dto.category} is disabled`,
        );
        return { sent: false, reason: 'Category disabled by user' };
      }

      // 2. 사용자의 디바이스 토큰 조회 (Look-Aside 패턴)
      const tokens = await this.tokenService.getUserTokens(dto.userId);

      if (tokens.length === 0) {
        this.logger.warn(`No device tokens found for user ${dto.userId}`);
        return { sent: false, reason: 'No device tokens' };
      }

      // 3. 알림 히스토리 먼저 저장 (sent = false 상태)
      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          category: dto.category as any,
          title: dto.title,
          body: dto.body,
          data: dto.data || null,
          sent: false, // 발송 전 상태
        },
      });

      // 4. FCM 메시지 전송
      const messaging = this.firebaseService.getMessaging();

      const message = {
        notification: {
          title: dto.title,
          body: dto.body,
        },
        data: dto.data
          ? Object.fromEntries(
              Object.entries(dto.data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      // 5. FCM 발송 성공 시 히스토리 상태 업데이트
      if (response.successCount > 0) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            sent: true,
            sentAt: new Date(),
          },
        });
      }

      // 6. 실패한 토큰 처리 (유효하지 않은 토큰 삭제)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            this.logger.warn(
              `Failed to send to token ${tokens[idx]}: ${resp.error?.message}`,
            );
          }
        });

        // 유효하지 않은 토큰 삭제
        if (failedTokens.length > 0) {
          await this.prisma.deviceToken.deleteMany({
            where: {
              token: { in: failedTokens },
            },
          });

          // Redis 캐시 무효화
          await this.redis.invalidateUserTokensCache(dto.userId);
        }
      }

      return {
        sent: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        notificationId: notification.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * 알림 목록 조회 (페이지네이션)
   */
  async getNotifications(userId: string, query: QueryNotificationsDto) {
    const { unreadOnly, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ConflictException('This notification does not belong to you');
    }

    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * 전체 알림 읽음 처리
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * 알림 삭제
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ConflictException('This notification does not belong to you');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * 테스트 알림 전송 (운영자 전용)
   * 자기 자신에게 테스트 알림을 전송
   */
  async sendTestNotification(userId: string) {
    // 디바이스 토큰 확인 (Look-Aside 패턴)
    const tokens = await this.tokenService.getUserTokens(userId);

    if (tokens.length === 0) {
      return {
        message: '테스트 알림 전송 실패',
        error:
          'FCM 디바이스 토큰이 등록되어 있지 않습니다. 먼저 토큰을 등록해주세요.',
        userId,
      };
    }

    // 알림 설정 확인
    const setting = await this.prisma.notificationSetting.findUnique({
      where: {
        userId_category: {
          userId,
          category: NotificationCategory.SYSTEM as any,
        },
      },
    });

    if (setting && !setting.enabled) {
      return {
        message: '테스트 알림 전송 실패',
        error: 'SYSTEM 카테고리 알림이 비활성화되어 있습니다.',
        userId,
        setting: {
          category: NotificationCategory.SYSTEM,
          enabled: false,
        },
      };
    }

    // 알림 전송
    const result = await this.sendNotification({
      userId,
      category: NotificationCategory.SYSTEM,
      title: '테스트 알림',
      body: '알림 시스템이 정상적으로 작동하고 있습니다.',
      data: {
        category: 'SYSTEM',
        test: 'true',
      },
    });

    return {
      message: '테스트 알림이 전송되었습니다',
      userId,
      deviceTokenCount: tokens.length,
      result,
    };
  }

  /**
   * 공지사항 알림 전송 (FCM Topic 사용)
   *
   * ⚠️ 비즈니스 정책: Topic 알림은 DB에 저장하지 않음 (휘발성)
   *
   * [배경]
   * - FCM Topic: 100만 명에게 1번 API 호출 (효율적)
   * - 100만 개 DB Row Insert: 비효율적
   * - Family Planner: 별도 게시판 제공 (Announcement 등)
   *
   * [결과]
   * - 푸시 알림: O (핸드폰 상단바)
   * - 알림함: X (저장 안 함)
   * - 게시판 목록: 별도 API
   *
   * [클라이언트 처리]
   * - 푸시 클릭 시: FCM data로 상세 조회
   * - 앱 내 알림함: 개인 알림만 표시
   * - 게시판 메뉴: 별도 화면에서 목록 제공
   *
   * @param announcement - 공지사항 객체 (id, title)
   */
  async sendAnnouncementNotification(announcement: {
    id: string;
    title: string;
  }) {
    try {
      const response = await this.firebaseService.sendToTopic(
        FcmTopic.ANNOUNCEMENTS,
        {
          title: '새 공지사항',
          body: announcement.title,
        },
        {
          category: 'SYSTEM',
          announcementId: announcement.id,
        },
      );

      this.logger.log(
        `Announcement notification sent to '${FcmTopic.ANNOUNCEMENTS}' topic: ${response}`,
      );

      return {
        sent: true,
        messageId: response,
        topic: FcmTopic.ANNOUNCEMENTS,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send announcement notification: ${error.message}`,
        error,
      );
      throw error;
    }
  }
}
