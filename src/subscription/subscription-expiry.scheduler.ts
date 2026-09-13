import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SubscriptionTier } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { MediaQuotaPlan } from '@/config/diary-media.config';
import { sumStoredMediaBytes } from '@/common/utils/media-usage.util';

const DAY_MS = 24 * 60 * 60 * 1000;
const GB = 1024 * 1024 * 1024;

/** 만료 며칠 전에 알릴지 */
const NOTICE_DAYS_BEFORE = 7;

/**
 * 발송 기록용 파생 이벤트
 *
 * 중복 발송 방지에 쓴다. 알림 창이 7일이므로 "최근 8일 내 발송 기록"이 있으면
 * 그건 반드시 이번 만료 건이다 (한 주기에 한 번만 나간다).
 */
export const EXPIRY_NOTICE_EVENT = 'EXPIRY_NOTICE';
const DEDUPE_WINDOW_MS = (NOTICE_DAYS_BEFORE + 1) * DAY_MS;

/**
 * 만료 임박 알림
 *
 * 대상은 **자동 갱신을 끈 사용자**뿐이다. 갱신될 사람에게 "곧 만료됩니다"를 보내면 거짓말이고,
 * 되돌릴 것도 없다. `autoRenewing: false`이면서 아직 혜택이 살아있는 구간이 만료 전에
 * 마음을 돌릴 수 있는 유일한 창이다.
 *
 * 본문에 "지금 저장 중인 용량 중 얼마가 한도를 넘게 되는지"를 싣는다. 단순 만료 안내보다
 * 잃을 것을 구체적으로 보여주는 쪽이 강하고, 실제로 사용자가 확인해야 할 정보이기도 하다.
 */
@Injectable()
export class SubscriptionExpiryScheduler {
  private readonly logger = new Logger(SubscriptionExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notification: NotificationService,
    private readonly i18n: I18nService,
  ) {}

  @Cron('0 10 * * *', { timeZone: 'Asia/Seoul' })
  async notifyExpiringSubscriptions() {
    if (!isSchedulerEnabled('subscription')) return;

    const now = new Date();
    const until = new Date(now.getTime() + NOTICE_DAYS_BEFORE * DAY_MS);

    // 혜택 만료일은 users.subscriptionExpiresAt이다 (체험 이월분이 반영된 값).
    // subscriptions.expiresAt은 스토어 원본이라 이월분만큼 어긋난다.
    const targets = await this.prisma.user.findMany({
      where: {
        subscriptionTier: { not: SubscriptionTier.free },
        subscriptionExpiresAt: { gt: now, lte: until },
        subscription: { autoRenewing: false },
      },
      select: {
        id: true,
        language: true,
        subscriptionExpiresAt: true,
        subscription: { select: { platform: true } },
      },
    });

    if (targets.length === 0) return;

    const userIds = targets.map((t) => t.id);
    const [notified, usage] = await Promise.all([
      this.findAlreadyNotified(userIds, now),
      sumStoredMediaBytes(this.prisma, userIds),
    ]);

    const freeTotalBytes = this.freeTotalBytes();
    let sent = 0;

    for (const target of targets) {
      if (notified.has(target.id)) continue;

      const usedBytes = usage.get(target.id) ?? 0;
      const daysLeft = this.daysUntil(target.subscriptionExpiresAt, now);

      try {
        await this.notify(target, daysLeft, usedBytes, freeTotalBytes);
        await this.recordNotice(target, usedBytes);
        sent++;
      } catch (error) {
        // 한 명이 실패해도 나머지는 보낸다
        this.logger.warn(
          `만료 임박 알림 실패 (userId=${target.id}): ${error.message}`,
        );
      }
    }

    this.logger.log(
      `만료 임박 알림 완료 (대상 ${targets.length}명, 발송 ${sent}명, 중복 제외 ${notified.size}명)`,
    );
  }

  /** 최근 8일 내 이미 보낸 사용자 (한 주기 1회 보장) */
  private async findAlreadyNotified(
    userIds: string[],
    now: Date,
  ): Promise<Set<string>> {
    const events = await this.prisma.subscriptionEvent.findMany({
      where: {
        userId: { in: userIds },
        eventType: EXPIRY_NOTICE_EVENT,
        processedAt: { gte: new Date(now.getTime() - DEDUPE_WINDOW_MS) },
      },
      select: { userId: true },
    });

    return new Set(events.map((e) => e.userId));
  }

  /** free 등급의 누적 한도 (한도 정의는 diary-media.config 한 곳에만 둔다) */
  private freeTotalBytes(): number {
    const plans =
      this.config.get<Record<string, MediaQuotaPlan>>('diaryMedia.plans');
    return plans[SubscriptionTier.free].totalBytes;
  }

  private daysUntil(expiresAt: Date | null, now: Date): number {
    if (!expiresAt) return 0;
    return Math.max(
      1,
      Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS),
    );
  }

  private async notify(
    target: { id: string; language: string | null },
    daysLeft: number,
    usedBytes: number,
    freeTotalBytes: number,
  ): Promise<void> {
    const lang = target.language ?? 'ko';
    const overBytes = usedBytes - freeTotalBytes;

    // 넘길 게 없으면 용량 얘기를 꺼내지 않는다 (대부분의 사용자가 여기 해당한다)
    const body =
      overBytes > 0
        ? this.i18n.t('subscription.notification.expiring_body_over_quota', {
            lang,
            args: {
              days: daysLeft,
              usedGb: this.toGb(usedBytes),
              overGb: this.toGb(overBytes),
            },
          })
        : this.i18n.t('subscription.notification.expiring_body', {
            lang,
            args: { days: daysLeft },
          });

    await this.notification.sendNotification({
      userId: target.id,
      category: NotificationCategory.SYSTEM,
      title: this.i18n.t('subscription.notification.expiring_title', { lang }),
      body,
      data: { action: 'view_subscription' },
    });
  }

  private async recordNotice(
    target: { id: string; subscription: { platform: any } | null },
    usedBytes: number,
  ): Promise<void> {
    if (!target.subscription) return;

    await this.prisma.subscriptionEvent.create({
      data: {
        userId: target.id,
        platform: target.subscription.platform,
        eventType: EXPIRY_NOTICE_EVENT,
        rawPayload: { usedBytes } as any,
      },
    });
  }

  private toGb(bytes: number): string {
    return (bytes / GB).toFixed(1);
  }
}
