import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

@Injectable()
export class FridgeScheduler {
  private readonly logger = new Logger(FridgeScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly i18n: I18nService,
  ) {}

  private async getUserLang(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return user?.language ?? 'ko';
  }

  /**
   * 매일 09:00 KST — 유통기한 임박/만료 품목 알림
   * expiresAt이 오늘 기준 alertDaysBefore 이하로 남은 품목을 그룹별로 발송
   */
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async runExpiryAlert() {
    if (!isSchedulerEnabled('')) return;
    this.logger.log('유통기한 알림 스케줄러 실행');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 오늘부터 최대 30일 이내 만료되는 품목 조회
    const maxAlert = new Date(today);
    maxAlert.setDate(maxAlert.getDate() + 30);

    const items = await this.prisma.fridgeItem.findMany({
      where: {
        expiresAt: { gte: today, lte: maxAlert },
      },
      include: { storageLocation: true },
    });

    // 그룹별로 묶어 알림 필요 여부 판별
    const groupMap = new Map<string, typeof items>();
    for (const item of items) {
      const daysLeft = Math.floor(
        (item.expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft > item.alertDaysBefore) continue;

      const list = groupMap.get(item.groupId) ?? [];
      list.push(item);
      groupMap.set(item.groupId, list);
    }

    for (const [groupId, expiringItems] of groupMap) {
      const members = await this.prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      });

      for (const item of expiringItems) {
        const daysLeft = Math.floor(
          (item.expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const member of members) {
          const lang = await this.getUserLang(member.userId);
          const titleKey =
            daysLeft === 0
              ? 'fridge.notification.expired_title'
              : 'fridge.notification.expiring_title';
          const bodyKey =
            daysLeft === 0
              ? 'fridge.notification.expired_body'
              : 'fridge.notification.expiring_body';
          await this.notificationQueue.enqueueImmediate({
            userId: member.userId,
            category: NotificationCategory.FRIDGE,
            title: this.i18n.t(titleKey, { lang }),
            body: this.i18n.t(bodyKey, {
              lang,
              args: { name: item.name, days: daysLeft },
            }),
            data: { action: 'view_fridge', groupId },
          });
        }
      }
    }

    this.logger.log(`유통기한 알림 완료 — ${groupMap.size}개 그룹 처리`);
  }
}
