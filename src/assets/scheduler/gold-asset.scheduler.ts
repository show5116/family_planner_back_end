import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

const LOCK_KEY = 'lock:assets:gold-monthly';
const LOCK_TTL = 5 * 60; // 5분

@Injectable()
export class GoldAssetScheduler {
  private readonly logger = new Logger(GoldAssetScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationService: NotificationService,
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
   * 매달 1일 00:00 KST (= UTC 전날 15:00) 실행
   * GOLD 타입 계좌의 최신 AccountRecord.gramWeight × GOLD_KRW_SPOT으로 자동 기록 생성
   */
  @Cron('0 15 28-31 * *')
  async createMonthlyGoldRecords() {
    if (!isSchedulerEnabled('')) return;
    const now = new Date();
    // KST = UTC+9, UTC 15:00 = KST 다음날 00:00
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    if (kstDate.getUTCDate() !== 1) return;

    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      LOCK_KEY,
      LOCK_TTL,
      lockValue,
    );
    if (!acquired) return;

    try {
      await this.runMonthlyGoldUpdate(kstDate);
    } finally {
      await this.redis.releaseLock(LOCK_KEY, lockValue);
    }
  }

  async runMonthlyGoldUpdate(kstDate: Date) {
    const goldIndicator = await this.prisma.indicator.findUnique({
      where: { symbol: 'GOLD_KRW_SPOT' },
      include: {
        prices: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!goldIndicator || goldIndicator.prices.length === 0) {
      this.logger.warn(
        'GOLD_KRW_SPOT 최신 시세 없음 — 월별 금 자산 업데이트 스킵',
      );
      return;
    }

    const pricePerGram = Number(goldIndicator.prices[0].price);

    // 기록 날짜: KST 기준 1일
    const recordDate = new Date(
      Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), 1),
    );

    const goldAccounts = await this.prisma.account.findMany({
      where: { type: 'GOLD' },
      select: { id: true, userId: true, name: true },
    });

    if (goldAccounts.length === 0) return;

    let updated = 0;
    for (const account of goldAccounts) {
      // 가장 최신 기록에서 gramWeight 조회
      const latestRecord = await this.prisma.accountRecord.findFirst({
        where: { accountId: account.id, gramWeight: { not: null } },
        orderBy: { recordDate: 'desc' },
      });

      if (!latestRecord || latestRecord.gramWeight === null) continue;

      const grams = Number(latestRecord.gramWeight);
      const balance = grams * pricePerGram;

      // 이미 해당 날짜 기록 존재 시 스킵
      const exists = await this.prisma.accountRecord.findUnique({
        where: { accountId_recordDate: { accountId: account.id, recordDate } },
      });
      if (exists) continue;

      // 직전 기록의 principal 이어받기
      const prevRecord = await this.prisma.accountRecord.findFirst({
        where: { accountId: account.id, recordDate: { lt: recordDate } },
        orderBy: { recordDate: 'desc' },
      });
      const principal = prevRecord ? Number(prevRecord.principal) : balance;
      const profit = balance - principal;

      await this.prisma.accountRecord.create({
        data: {
          accountId: account.id,
          recordDate,
          balance,
          principal,
          profit,
          gramWeight: grams,
          note: `자동 업데이트 (금 현물가 ${pricePerGram.toLocaleString('ko-KR')}원/g × ${grams}g)`,
        },
      });

      const lang = await this.getUserLang(account.userId);
      await this.notificationService.sendNotification({
        userId: account.userId,
        category: NotificationCategory.ASSET,
        title: this.i18n.t('assets.notification.balance_updated_title', {
          lang,
        }),
        body: this.i18n.t('assets.notification.balance_updated_body', {
          lang,
          args: {
            name: account.name,
            balance: balance.toLocaleString(),
          },
        }),
        data: { assetId: account.id },
      });

      updated++;
    }

    this.logger.log(`월별 금 자산 업데이트 완료 — ${updated}개 계좌`);
  }
}
