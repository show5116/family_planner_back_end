import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseService } from '@/firebase/firebase.service';
import { RedisService } from '@/redis/redis.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { NotificationCategory } from './enums/notification-category.enum';
import { FcmTopic } from './enums/fcm-topic.enum';

/**
 * 알림 토큰 관리 서비스
 * FCM 디바이스 토큰 등록/삭제 및 Topic 구독 관리
 */
@Injectable()
export class NotificationTokenService {
  private readonly logger = new Logger(NotificationTokenService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private redis: RedisService,
  ) {}

  /**
   * FCM 디바이스 토큰 등록 + Topic 자동 구독
   *
   * 플랫폼별 1개만 유지: 신규 토큰 등록 시 같은 사용자·플랫폼의 기존 토큰을 모두 교체
   */
  async registerToken(userId: string, dto: RegisterTokenDto) {
    try {
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token: dto.token },
      });

      let oldUserId: string | null = null;

      // 다른 사용자 소유 토큰: 계정 전환 시나리오
      if (existingToken && existingToken.userId !== userId) {
        oldUserId = existingToken.userId;
        this.logger.warn(
          `Token transferred from user ${existingToken.userId} to ${userId}`,
        );
      }

      // 이미 같은 사용자·같은 토큰이면 lastUsed만 갱신 (플랫폼 교체 없음)
      if (existingToken && existingToken.userId === userId) {
        const deviceToken = await this.prisma.deviceToken.update({
          where: { token: dto.token },
          data: { lastUsed: new Date(), platform: dto.platform },
        });
        await this.redis.invalidateUserTokensCache(userId);
        return deviceToken;
      }

      // 신규 토큰: 트랜잭션으로 기존 플랫폼 토큰 전부 교체
      const { deviceToken, deletedTokenStrings } =
        await this.prisma.$transaction(async (tx) => {
          // 다른 사용자 소유였던 토큰 삭제
          if (existingToken) {
            await tx.deviceToken.delete({ where: { token: dto.token } });
          }

          // 같은 사용자의 동일 플랫폼 기존 토큰 모두 조회 후 삭제
          const oldTokens = await tx.deviceToken.findMany({
            where: { userId, platform: dto.platform },
            select: { token: true },
          });

          if (oldTokens.length > 0) {
            await tx.deviceToken.deleteMany({
              where: { userId, platform: dto.platform },
            });
          }

          const created = await tx.deviceToken.create({
            data: { userId, token: dto.token, platform: dto.platform },
          });

          return {
            deviceToken: created,
            deletedTokenStrings: oldTokens.map((t) => t.token),
          };
        });

      // Redis 캐시 무효화
      if (oldUserId) {
        await this.redis.invalidateUserTokensCache(oldUserId);
      }
      await this.redis.invalidateUserTokensCache(userId);

      if (deletedTokenStrings.length > 0) {
        this.logger.log(
          `Replaced ${deletedTokenStrings.length} old ${dto.platform} token(s) for user ${userId}`,
        );
      }

      // Topic 구독 처리 (비동기)
      if (oldUserId && existingToken) {
        this.unsubscribeUserFromTopics(oldUserId, [dto.token]).catch((err) => {
          this.logger.error(
            `Background task failed - unsubscribe topics for user ${oldUserId}: ${err.message}`,
          );
        });
      }

      this.subscribeUserToTopics(userId, [dto.token]).catch((err) => {
        this.logger.error(
          `Background task failed - subscribe topics for user ${userId}: ${err.message}`,
        );
      });

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

    // Topic 구독 해제 (비동기 - 실패해도 서비스 정상 동작)
    this.unsubscribeUserFromTopics(userId, [token]).catch((err) => {
      this.logger.error(
        `Background task failed - unsubscribe topics for user ${userId}: ${err.message}`,
      );
    });

    // DB에서 토큰 삭제
    await this.prisma.deviceToken.delete({
      where: { token },
    });

    // Redis 캐시 무효화 (Race Condition 방지)
    await this.redis.invalidateUserTokensCache(userId);

    return { message: 'Token deleted successfully' };
  }

  /**
   * 사용자의 FCM 토큰 조회 (Look-Aside 패턴)
   *
   * @param userId - 사용자 ID
   * @returns 토큰 배열
   */
  async getUserTokens(userId: string): Promise<string[]> {
    // 1. Redis 캐시 조회
    const cachedTokens = await this.redis.getCachedUserTokens(userId);

    if (cachedTokens !== null) {
      // 캐시 히트
      return cachedTokens;
    }

    // 2. 캐시 미스 - DB 조회
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    const tokens = deviceTokens.map((dt) => dt.token);

    // 3. Redis에 캐싱 (TTL: 1일)
    await this.redis.cacheUserTokens(userId, tokens);

    return tokens;
  }

  /**
   * 사용자의 토큰을 활성화된 알림 카테고리 Topic에 구독
   * SYSTEM 알림이 활성화된 경우 announcements Topic 구독
   *
   * @param userId - 사용자 ID
   * @param tokens - 디바이스 토큰 배열
   */
  async subscribeUserToTopics(userId: string, tokens: string[]) {
    try {
      // 사용자의 알림 설정 조회
      const settings = await this.prisma.notificationSetting.findMany({
        where: { userId },
      });

      // SYSTEM 알림이 활성화된 경우 announcements Topic 구독
      const systemSetting = settings.find(
        (s) => s.category === (NotificationCategory.SYSTEM as any),
      );

      if (!systemSetting || systemSetting.enabled) {
        // 기본값 또는 명시적으로 활성화된 경우
        await this.firebaseService.subscribeToTopic(
          tokens,
          FcmTopic.ANNOUNCEMENTS,
        );
        this.logger.log(
          `User ${userId} subscribed to '${FcmTopic.ANNOUNCEMENTS}' topic (${tokens.length} tokens)`,
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
  async unsubscribeUserFromTopics(userId: string, tokens: string[]) {
    try {
      // 모든 Topic에서 구독 해제
      await this.firebaseService.unsubscribeFromTopic(
        tokens,
        FcmTopic.ANNOUNCEMENTS,
      );
      this.logger.log(
        `User ${userId} unsubscribed from '${FcmTopic.ANNOUNCEMENTS}' topic (${tokens.length} tokens)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId} from topics: ${error.message}`,
        error,
      );
    }
  }
}
