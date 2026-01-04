import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseService } from '@/firebase/firebase.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationCategory } from './enums/notification-category.enum';

/**
 * 알림 서비스
 * FCM 토큰 관리, 알림 설정, 알림 전송 및 히스토리 관리
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * FCM 디바이스 토큰 등록 + Topic 자동 구독
   */
  async registerToken(userId: string, dto: RegisterTokenDto) {
    try {
      // 기존 토큰이 있으면 업데이트, 없으면 생성
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token: dto.token },
      });

      let deviceToken;

      if (existingToken) {
        // 다른 사용자에게 등록된 토큰이면 기존 토큰 삭제 후 새로 등록
        // (계정 전환 시나리오: 사용자 A 로그아웃 → 사용자 B 로그인)
        if (existingToken.userId !== userId) {
          this.logger.warn(
            `Token ${dto.token} is being transferred from user ${existingToken.userId} to ${userId}`,
          );

          // 기존 사용자의 Topic 구독 해제
          await this.unsubscribeUserFromTopics(existingToken.userId, [
            dto.token,
          ]);

          // 기존 토큰 삭제
          await this.prisma.deviceToken.delete({
            where: { token: dto.token },
          });

          // 새로운 사용자로 등록
          deviceToken = await this.prisma.deviceToken.create({
            data: {
              userId,
              token: dto.token,
              platform: dto.platform,
            },
          });

          // 새로운 사용자의 Topic 구독 (비동기)
          void this.subscribeUserToTopics(userId, [dto.token]);
        } else {
          // 같은 사용자라면 lastUsed만 업데이트
          deviceToken = await this.prisma.deviceToken.update({
            where: { token: dto.token },
            data: {
              lastUsed: new Date(),
              platform: dto.platform,
            },
          });
        }
      } else {
        // 새로운 토큰 등록
        deviceToken = await this.prisma.deviceToken.create({
          data: {
            userId,
            token: dto.token,
            platform: dto.platform,
          },
        });

        // Topic 구독 (비동기)
        void this.subscribeUserToTopics(userId, [dto.token]);
      }

      return deviceToken;
    } catch (error) {
      this.logger.error(`Failed to register token: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * FCM 디바이스 토큰 삭제 + Topic 구독 해제
   */
  async deleteToken(userId: string, token: string) {
    const deviceToken = await this.prisma.deviceToken.findUnique({
      where: { token },
    });

    if (!deviceToken) {
      throw new NotFoundException('Token not found');
    }

    if (deviceToken.userId !== userId) {
      throw new ConflictException('This token does not belong to you');
    }

    // Topic 구독 해제 (비동기)
    void this.unsubscribeUserFromTopics(userId, [token]);

    await this.prisma.deviceToken.delete({
      where: { token },
    });

    return { message: 'Token deleted successfully' };
  }

  /**
   * 알림 설정 조회 (모든 카테고리)
   */
  async getSettings(userId: string) {
    const settings = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });

    // 모든 카테고리에 대한 기본 설정 생성
    const allCategories = Object.values(NotificationCategory);
    const existingCategories = settings.map((s) => s.category);
    const missingCategories = allCategories.filter(
      (cat) => !existingCategories.includes(cat as any),
    );

    // 누락된 카테고리에 대한 기본 설정 생성
    if (missingCategories.length > 0) {
      await this.prisma.notificationSetting.createMany({
        data: missingCategories.map((category) => ({
          userId,
          category: category as any,
          enabled: true,
        })),
      });

      // 다시 조회
      return await this.prisma.notificationSetting.findMany({
        where: { userId },
        orderBy: { category: 'asc' },
      });
    }

    return settings;
  }

  /**
   * 알림 설정 업데이트 + Topic 구독 관리
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const result = await this.prisma.notificationSetting.upsert({
      where: {
        userId_category: {
          userId,
          category: dto.category as any,
        },
      },
      update: {
        enabled: dto.enabled,
      },
      create: {
        userId,
        category: dto.category as any,
        enabled: dto.enabled,
      },
    });

    // SYSTEM 알림 설정 변경 시 Topic 구독/해제 처리 (비동기)
    if (dto.category === NotificationCategory.SYSTEM) {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      const tokens = deviceTokens.map((dt) => dt.token);

      if (tokens.length > 0) {
        if (dto.enabled) {
          // 알림 활성화 → Topic 구독
          void this.firebaseService
            .subscribeToTopic(tokens, 'announcements')
            .catch((err) => {
              this.logger.error(
                `Failed to subscribe user ${userId} to announcements topic: ${err.message}`,
              );
            });
        } else {
          // 알림 비활성화 → Topic 구독 해제
          void this.firebaseService
            .unsubscribeFromTopic(tokens, 'announcements')
            .catch((err) => {
              this.logger.error(
                `Failed to unsubscribe user ${userId} from announcements topic: ${err.message}`,
              );
            });
        }
      }
    }

    return result;
  }

  /**
   * 알림 전송
   */
  async sendNotification(dto: SendNotificationDto) {
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

      // 2. 사용자의 디바이스 토큰 조회
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: dto.userId },
      });

      if (deviceTokens.length === 0) {
        this.logger.warn(`No device tokens found for user ${dto.userId}`);
        return { sent: false, reason: 'No device tokens' };
      }

      // 3. FCM 메시지 전송
      const messaging = this.firebaseService.getMessaging();
      const tokens = deviceTokens.map((dt) => dt.token);

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

      // 4. 알림 히스토리 저장
      await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          category: dto.category as any,
          title: dto.title,
          body: dto.body,
          data: dto.data || null,
        },
      });

      // 5. 실패한 토큰 처리 (유효하지 않은 토큰 삭제)
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
        }
      }

      return {
        sent: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
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
        orderBy: { sentAt: 'desc' },
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
    // 디바이스 토큰 확인
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId },
    });

    if (deviceTokens.length === 0) {
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
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      message: '테스트 알림이 전송되었습니다',
      userId,
      deviceTokenCount: deviceTokens.length,
      result,
    };
  }

  /**
   * 사용자의 토큰을 활성화된 알림 카테고리 Topic에 구독
   * SYSTEM 알림이 활성화된 경우 'announcements' Topic 구독
   *
   * @param userId - 사용자 ID
   * @param tokens - 디바이스 토큰 배열
   */
  private async subscribeUserToTopics(userId: string, tokens: string[]) {
    try {
      // 사용자의 알림 설정 조회
      const settings = await this.prisma.notificationSetting.findMany({
        where: { userId },
      });

      // SYSTEM 알림이 활성화된 경우 'announcements' Topic 구독
      const systemSetting = settings.find(
        (s) => s.category === (NotificationCategory.SYSTEM as any),
      );

      if (!systemSetting || systemSetting.enabled) {
        // 기본값 또는 명시적으로 활성화된 경우
        await this.firebaseService.subscribeToTopic(tokens, 'announcements');
        this.logger.log(
          `User ${userId} subscribed to 'announcements' topic (${tokens.length} tokens)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to subscribe user ${userId} to topics: ${error.message}`,
        error,
      );
    }
  }

  /**
   * 사용자의 토큰을 Topic에서 구독 해제
   *
   * @param userId - 사용자 ID
   * @param tokens - 디바이스 토큰 배열
   */
  private async unsubscribeUserFromTopics(userId: string, tokens: string[]) {
    try {
      // 모든 Topic에서 구독 해제
      await this.firebaseService.unsubscribeFromTopic(tokens, 'announcements');
      this.logger.log(
        `User ${userId} unsubscribed from 'announcements' topic (${tokens.length} tokens)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId} from topics: ${error.message}`,
        error,
      );
    }
  }

  /**
   * 공지사항 알림 전송 (FCM Topic 사용)
   * SYSTEM 알림이 켜진 모든 사용자에게 한 번의 API 호출로 전송
   *
   * @param announcement - 공지사항 객체
   */
  async sendAnnouncementNotification(announcement: {
    id: string;
    title: string;
  }) {
    try {
      // Topic으로 알림 전송 (10만 명이든 100만 명이든 단일 API 호출)
      const response = await this.firebaseService.sendToTopic(
        'announcements',
        {
          title: '새 공지사항',
          body: announcement.title,
        },
        {
          announcementId: announcement.id,
          action: 'view_announcement',
        },
      );

      this.logger.log(
        `Announcement notification sent to 'announcements' topic: ${response}`,
      );

      return {
        sent: true,
        messageId: response,
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
