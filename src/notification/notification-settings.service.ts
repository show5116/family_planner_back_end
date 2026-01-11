import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseService } from '@/firebase/firebase.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { NotificationCategory } from './enums/notification-category.enum';

/**
 * 알림 설정 관리 서비스
 * 카테고리별 알림 on/off 설정 및 Topic 구독 관리
 */
@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

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
          // 알림 활성화 → Topic 구독 (비동기 - 실패해도 서비스 정상 동작)
          this.firebaseService
            .subscribeToTopic(tokens, 'announcements')
            .catch((err) => {
              this.logger.error(
                `Background task failed - subscribe user ${userId} to announcements topic: ${err.message}`,
              );
            });
        } else {
          // 알림 비활성화 → Topic 구독 해제 (비동기 - 실패해도 서비스 정상 동작)
          this.firebaseService
            .unsubscribeFromTopic(tokens, 'announcements')
            .catch((err) => {
              this.logger.error(
                `Background task failed - unsubscribe user ${userId} from announcements topic: ${err.message}`,
              );
            });
        }
      }
    }

    return result;
  }
}
