import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@/redis/redis.service';
import { NotificationQueueService } from './notification-queue.service';

/**
 * Two-Track 알림 시스템 Worker
 * 1. Ready Queue 소비 (무한 루프 + BLPOP, 실시간, 병렬 처리)
 * 2. Waiting Room → Ready Queue 이동 (Cron 1분마다)
 * 3. Graceful Shutdown 지원 (OnModuleDestroy)
 */
@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private isRunning = false; // Worker 실행 상태
  private readonly concurrency = 5; // 병렬 워커 개수

  constructor(
    private readonly redis: RedisService,
    private readonly queueService: NotificationQueueService,
  ) {}

  /**
   * 모듈 초기화 시 Worker 자동 시작
   */
  onModuleInit() {
    this.logger.log('NotificationWorker initialized');
    this.startWorker();
  }

  /**
   * 무한 루프 Worker 시작 (BLPOP 기반 실시간 처리, 병렬)
   */
  private startWorker() {
    if (this.isRunning) {
      this.logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log(
      `Starting notification worker (infinite loop + BLPOP, concurrency: ${this.concurrency})`,
    );

    // 병렬 워커 실행: concurrency 개수만큼 루프 실행
    // Node.js는 싱글 스레드지만, I/O 대기(BLPOP, FCM 발송)가 많아서 병렬 효과 큼
    for (let i = 0; i < this.concurrency; i++) {
      this.runWorkerLoop(i + 1).catch((error) => {
        this.logger.error(
          `Worker #${i + 1} crashed: ${error.message}`,
          error.stack,
        );
      });
    }
  }

  /**
   * Worker 무한 루프 (BLPOP으로 실시간 처리)
   * @param workerId 워커 ID (로깅용)
   */
  private async runWorkerLoop(workerId: number) {
    this.logger.log(`Worker #${workerId} started`);

    while (this.isRunning) {
      try {
        // BLPOP: 큐에 데이터가 들어올 때까지 여기서 대기 (CPU 사용 안 함)
        // 타임아웃 5초 후에도 없으면 null 반환 → 다시 루프
        const processed = await this.queueService.processOneWithBlocking(5);

        // 타임아웃 발생 시 (큐가 비어있음) - 아무 것도 안 함, 다시 BLPOP 대기
        if (!processed) {
          // 로그 생략 (너무 많이 찍힘)
          continue;
        }

        // 성공 시 - 바로 다음 알림 처리
      } catch (error) {
        this.logger.error(`Worker #${workerId} error: ${error.message}`);

        // 에러 발생 시 1초 대기 후 재시작 (무한 에러 루프 방지)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.warn(`Worker #${workerId} stopped`);
  }

  /**
   * 매 1분마다: Waiting Room에서 발송 시간이 된 알림들을 Ready Queue로 이동
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async moveWaitingToReady() {
    try {
      const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp (초)
      const movedCount =
        await this.redis.moveReadyNotificationsFromWaiting(currentTime);

      if (movedCount > 0) {
        this.logger.log(
          `Moved ${movedCount} scheduled notifications to Ready Queue`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to move notifications from Waiting Room: ${error.message}`,
      );
    }
  }

  /**
   * 매 5분마다: 큐 상태 로깅 (모니터링용)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async logQueueStatus() {
    try {
      const readySize = await this.redis.getReadyQueueSize();
      const waitingSize = await this.redis.getWaitingRoomSize();

      this.logger.log(
        `Queue Status - Ready: ${readySize}, Waiting: ${waitingSize}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log queue status: ${error.message}`);
    }
  }

  /**
   * Graceful Shutdown: 앱 종료 시 Worker 안전하게 중지
   * - 서버 재시작 시 처리 중인 알림이 완료될 때까지 대기
   * - 최대 30초 대기 (NestJS 기본 shutdown timeout)
   */
  async onModuleDestroy() {
    this.logger.log('Graceful shutdown initiated');

    // 1. 더 이상 새로운 작업을 받지 않도록 플래그 설정
    this.isRunning = false;

    // 2. 모든 Worker가 현재 처리 중인 작업을 완료할 때까지 대기
    // BLPOP 타임아웃이 최대 5초이므로, 최대 5초 후에 모든 Worker 종료됨
    this.logger.log('Waiting for all workers to finish current tasks...');
    await new Promise((resolve) => setTimeout(resolve, 6000)); // 5초 + 1초 여유

    this.logger.log('All workers stopped. Shutdown complete.');
  }
}
