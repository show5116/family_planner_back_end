import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DiaryMedia,
  MediaStatus,
  MediaType,
  Prisma,
  SubscriptionTier,
} from '@prisma/client';
import dayjs from 'dayjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { StorageService } from '@/storage/storage.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { formatDateOnly, parseDateOnly } from '@/common/utils/date-kst.util';
import { DiaryMediaQuotaService } from './diary-media-quota.service';
import { QuotaExceededException } from './quota-exceeded.exception';
import {
  ALLOWED_MIME_TYPES,
  DIARY_MEDIA_FOLDER,
  QUOTA_LOCK_MAX_RETRIES,
  QUOTA_LOCK_RETRY_DELAY_MS,
  QUOTA_LOCK_TTL_SECONDS,
  quotaLockKey,
} from './diary-media.constants';
import { ReserveMediaDto } from './dto/reserve-media.dto';
import { LargeMediaQueryDto } from './dto/large-media-query.dto';
import {
  ConfirmMediaResultDto,
  DiaryMediaDto,
  LargeMediaListDto,
  MediaQuotaDto,
  ReserveMediaResultDto,
} from './dto/diary-media-response.dto';

@Injectable()
export class DiaryMediaService {
  private readonly logger = new Logger(DiaryMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly quotaService: DiaryMediaQuotaService,
    private readonly subscription: SubscriptionService,
  ) {}

  /* ── 조회 ─────────────────────────────────────────────────────────────── */

  async getQuota(userId: string): Promise<MediaQuotaDto> {
    const tier = await this.resolveTier(userId);
    return this.quotaService.getQuota(userId, tier);
  }

  /** 용량 큰 미디어 Top N (저장공간 관리 화면용) */
  async findLarge(
    userId: string,
    query: LargeMediaQueryDto,
  ): Promise<LargeMediaListDto> {
    const media = await this.prisma.diaryMedia.findMany({
      where: {
        userId,
        status: MediaStatus.CONFIRMED,
        deletedAt: null,
        ...(query.onlyOriginal ? { isOriginal: true } : {}),
      },
      orderBy: { fileSize: 'desc' },
      take: query.limit ?? 20,
      include: { diary: { select: { date: true } } },
    });

    const items = await Promise.all(
      media.map(async (m) => ({
        id: m.id,
        diaryId: m.diaryId,
        date: m.diary ? formatDateOnly(m.diary.date) : null,
        type: m.type,
        fileName: m.fileName,
        fileSize: m.fileSize ?? 0,
        originalSize: m.originalSize,
        isOriginal: m.isOriginal,
        thumbnailUrl: await this.signKey(m.thumbnailKey),
        uploadedAt: m.uploadedAt,
      })),
    );

    return { items };
  }

  /* ── 업로드 3단계 ─────────────────────────────────────────────────────── */

  /**
   * [1] 한도 검증 + 자리 예약 + presigned PUT URL 발급
   *
   * 비용이 큰 것부터 막는다: 파일 크기 → 영상 권한 → 영상 길이 → MIME → 한도.
   */
  async reserve(
    userId: string,
    dto: ReserveMediaDto,
  ): Promise<ReserveMediaResultDto> {
    const tier = await this.resolveTier(userId);
    const plan = this.quotaService.getPlan(tier);

    if (dto.declaredSize > plan.perFileBytes) {
      throw new PayloadTooLargeException('diary.errors.file_too_large');
    }

    if (dto.type === MediaType.VIDEO && !plan.videoAllowed) {
      throw new ForbiddenException('diary.errors.video_not_allowed');
    }

    if (
      dto.type === MediaType.VIDEO &&
      plan.maxVideoDurationMs !== null &&
      dto.durationMs !== undefined &&
      dto.durationMs > plan.maxVideoDurationMs
    ) {
      throw new BadRequestException('diary.errors.video_too_long');
    }

    if (!ALLOWED_MIME_TYPES[dto.type].includes(dto.mimeType)) {
      throw new BadRequestException('diary.errors.invalid_mime_type');
    }

    const diaryId = await this.resolveDiaryId(userId, dto);
    const storageKey = this.buildStorageKey(userId, dto.fileName);
    const expiresIn = this.config.get<number>('diaryMedia.uploadUrlExpiresIn');

    // 동시 요청이 각각 한도를 통과해 합계가 넘어가지 않도록 사용자 단위로 직렬화한다
    const sortOrder = diaryId ? await this.nextSortOrder(diaryId) : 0;

    const media = await this.withQuotaLock(userId, async () => {
      const quota = await this.quotaService.getQuota(userId, tier);

      if (!this.quotaService.hasRoomFor(quota, dto.declaredSize)) {
        throw new QuotaExceededException(this.quotaErrorKey(quota), quota);
      }

      return this.prisma.diaryMedia.create({
        data: {
          userId,
          diaryId,
          type: dto.type,
          status: MediaStatus.PENDING,
          storageKey,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
          declaredSize: dto.declaredSize,
          originalSize: dto.originalSize,
          isOriginal: dto.isOriginal ?? false,
          width: dto.width,
          height: dto.height,
          durationMs: dto.durationMs,
          sortOrder,
        },
      });
    });

    const uploadUrl = await this.storage.getUploadUrl(
      storageKey,
      dto.mimeType,
      expiresIn,
    );

    return { mediaId: media.id, uploadUrl, storageKey, expiresIn };
  }

  /**
   * [3] 업로드 완료 확정
   *
   * ★ presigned URL은 발급 후 만료 전까지 그 키에 무엇이든 쓸 수 있다.
   * 신고값(declaredSize)만 믿으면 1KB로 예약하고 200MB를 올릴 수 있으므로
   * 반드시 HeadObject 실측값으로 확정·재검증한다.
   */
  async confirm(userId: string, id: string): Promise<ConfirmMediaResultDto> {
    const media = await this.prisma.diaryMedia.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!media) {
      throw new NotFoundException('diary.errors.media_not_found');
    }

    if (media.status === MediaStatus.CONFIRMED) {
      // 재시도로 두 번 들어온 경우 — 이미 확정된 상태를 그대로 돌려준다
      const tier = await this.resolveTier(userId);
      return {
        media: await this.toMediaDto(media),
        quota: await this.quotaService.getQuota(userId, tier),
      };
    }

    const meta = await this.storage.getFileMetadata(media.storageKey);
    if (!meta || meta.size <= 0) {
      throw new BadRequestException('diary.errors.upload_not_found');
    }

    if (
      meta.contentType &&
      !ALLOWED_MIME_TYPES[media.type].includes(meta.contentType)
    ) {
      await this.storage.deleteFile(media.storageKey);
      await this.prisma.diaryMedia.delete({ where: { id: media.id } });
      throw new BadRequestException('diary.errors.invalid_mime_type');
    }

    const tier = await this.resolveTier(userId);
    const plan = this.quotaService.getPlan(tier);

    if (meta.size > plan.perFileBytes) {
      await this.discardUpload(media);
      throw new PayloadTooLargeException('diary.errors.file_too_large');
    }

    const confirmed = await this.withQuotaLock(userId, async () => {
      // 예약분(declaredSize)을 뺀 상태에서 실측값이 들어갈 자리가 있는지 본다
      const quota = await this.quotaService.getQuota(userId, tier);
      const extra = meta.size - media.declaredSize;

      if (extra > 0 && !this.quotaService.hasRoomFor(quota, extra)) {
        await this.discardUpload(media);
        throw new QuotaExceededException(this.quotaErrorKey(quota), quota);
      }

      return this.prisma.diaryMedia.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.CONFIRMED,
          fileSize: meta.size,
          uploadedAt: new Date(),
        },
      });
    });

    return {
      media: await this.toMediaDto(confirmed),
      quota: await this.quotaService.getQuota(userId, tier),
    };
  }

  /* ── 삭제·정렬 ────────────────────────────────────────────────────────── */

  /**
   * 미디어 삭제 — R2에서 즉시·영구 삭제
   *
   * 행은 남긴다(soft delete). 행까지 지우면 월간 한도가 회복돼
   * "지웠다 올렸다"로 실질 무한 용량이 된다. 누적 한도만 즉시 회복된다.
   */
  async remove(userId: string, id: string): Promise<{ message: string }> {
    const media = await this.prisma.diaryMedia.findFirst({
      where: { id, deletedAt: null },
    });

    if (!media) {
      throw new NotFoundException('diary.errors.media_not_found');
    }

    await this.validateMediaAccess(userId, media);
    await this.softDelete([media]);

    return { message: 'diary.success.media_deleted' };
  }

  /** 첨부 순서 변경 (한 일기의 미디어 전체를 받은 순서대로 재배치) */
  async reorder(userId: string, mediaIds: string[]): Promise<DiaryMediaDto[]> {
    const media = await this.prisma.diaryMedia.findMany({
      where: { id: { in: mediaIds }, deletedAt: null },
    });

    if (media.length !== mediaIds.length) {
      throw new NotFoundException('diary.errors.media_not_found');
    }

    const diaryId = media[0].diaryId;
    const diaryIds = new Set(media.map((m) => m.diaryId));
    if (diaryIds.size !== 1 || diaryId === null) {
      throw new BadRequestException('diary.errors.media_reorder_mixed');
    }

    await this.validateMediaAccess(userId, media[0]);

    await this.prisma.$transaction(
      mediaIds.map((mediaId, index) =>
        this.prisma.diaryMedia.update({
          where: { id: mediaId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findByDiaryId(diaryId);
  }

  /* ── 일기 연동 ────────────────────────────────────────────────────────── */

  /** 일기 저장 시 첨부 연결 — 내가 올린, 아직 어디에도 붙지 않은 CONFIRMED만 */
  async attachToDiary(
    userId: string,
    diaryId: string,
    mediaIds: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (mediaIds.length === 0) return;

    const media = await tx.diaryMedia.findMany({
      where: {
        id: { in: mediaIds },
        userId,
        status: MediaStatus.CONFIRMED,
        deletedAt: null,
      },
      select: { id: true, diaryId: true },
    });

    if (media.length !== mediaIds.length) {
      throw new NotFoundException('diary.errors.media_not_found');
    }

    if (media.some((m) => m.diaryId !== null && m.diaryId !== diaryId)) {
      throw new BadRequestException('diary.errors.media_already_attached');
    }

    const base = await tx.diaryMedia.count({
      where: { diaryId, deletedAt: null },
    });

    for (const [index, mediaId] of mediaIds.entries()) {
      await tx.diaryMedia.update({
        where: { id: mediaId },
        data: { diaryId, sortOrder: base + index },
      });
    }
  }

  /** 일기 목록 응답용 — diaryId별 미디어 맵 */
  async findByDiaryIds(
    diaryIds: string[],
  ): Promise<Map<string, DiaryMediaDto[]>> {
    const map = new Map<string, DiaryMediaDto[]>();
    if (diaryIds.length === 0) return map;

    const media = await this.prisma.diaryMedia.findMany({
      where: {
        diaryId: { in: diaryIds },
        status: MediaStatus.CONFIRMED,
        deletedAt: null,
      },
      orderBy: [{ diaryId: 'asc' }, { sortOrder: 'asc' }],
    });

    for (const m of media) {
      if (!m.diaryId) continue;
      const list = map.get(m.diaryId) ?? [];
      list.push(await this.toMediaDto(m));
      map.set(m.diaryId, list);
    }

    return map;
  }

  async findByDiaryId(diaryId: string): Promise<DiaryMediaDto[]> {
    const map = await this.findByDiaryIds([diaryId]);
    return map.get(diaryId) ?? [];
  }

  /** 미디어가 붙어 있는 일기 ID 집합 (캘린더 hasMedia용) */
  async findDiaryIdsWithMedia(diaryIds: string[]): Promise<Set<string>> {
    if (diaryIds.length === 0) return new Set();

    const rows = await this.prisma.diaryMedia.groupBy({
      by: ['diaryId'],
      where: {
        diaryId: { in: diaryIds },
        status: MediaStatus.CONFIRMED,
        deletedAt: null,
      },
    });

    return new Set(
      rows.map((r) => r.diaryId).filter((id): id is string => !!id),
    );
  }

  /**
   * 일기가 완전 삭제될 때(휴지통 덮어쓰기·30일 경과 purge) 첨부를 함께 정리한다.
   *
   * R2 파일은 즉시 지우고 행은 남긴다 — 행이 FK cascade로 사라지면
   * 월간 한도가 회복돼 버린다.
   */
  async purgeForDiaries(diaryIds: string[]): Promise<number> {
    if (diaryIds.length === 0) return 0;

    const media = await this.prisma.diaryMedia.findMany({
      where: { diaryId: { in: diaryIds }, deletedAt: null },
    });

    await this.softDelete(media);
    return media.length;
  }

  /* ── 정리 스케줄러 ────────────────────────────────────────────────────── */

  /** 만료된 예약 — presigned만 받고 업로드하지 않은 것. 예약 용량만 잡고 있다 */
  async cleanupExpiredReservations(now: Date = new Date()): Promise<number> {
    const cutoff = this.quotaService.pendingCutoff(now);

    const expired = await this.prisma.diaryMedia.findMany({
      where: {
        status: MediaStatus.PENDING,
        reservedAt: { lt: cutoff },
      },
      take: 500,
    });

    for (const media of expired) {
      await this.safeDeleteFile(media.storageKey);
      await this.safeDeleteFile(media.thumbnailKey);
    }

    if (expired.length > 0) {
      await this.prisma.diaryMedia.deleteMany({
        where: { id: { in: expired.map((m) => m.id) } },
      });
    }

    return expired.length;
  }

  /** 고아 미디어 — 사진만 올리고 일기를 저장하지 않고 나간 경우 */
  async cleanupOrphanMedia(now: Date = new Date()): Promise<number> {
    const hours = this.config.get<number>('diaryMedia.orphanTtlHours');
    const cutoff = dayjs(now).subtract(hours, 'hour').toDate();

    const orphans = await this.prisma.diaryMedia.findMany({
      where: {
        diaryId: null,
        status: MediaStatus.CONFIRMED,
        deletedAt: null,
        uploadedAt: { lt: cutoff },
      },
      take: 500,
    });

    await this.softDelete(orphans);
    return orphans.length;
  }

  /**
   * 두 집계 어디에도 영향을 주지 않게 된 삭제 행 정리
   *
   * 이미 지워진 행(누적 집계 제외)이면서 지난 달 이전 업로드(월간 집계 제외)라
   * 지금 지워도 한도가 되돌아가지 않는다.
   */
  async purgeStaleDeletedRows(now: Date = new Date()): Promise<number> {
    const monthStart = this.quotaService.monthStart(now);

    const { count } = await this.prisma.diaryMedia.deleteMany({
      where: {
        deletedAt: { not: null },
        OR: [{ uploadedAt: null }, { uploadedAt: { lt: monthStart } }],
      },
    });

    return count;
  }

  /* ── 내부 헬퍼 ────────────────────────────────────────────────────────── */

  /** R2 파일만 즉시 지우고 행은 남긴다 (월간 한도는 회복시키지 않는다) */
  private async softDelete(media: DiaryMedia[]): Promise<void> {
    if (media.length === 0) return;

    for (const m of media) {
      await this.safeDeleteFile(m.storageKey);
      await this.safeDeleteFile(m.thumbnailKey);
    }

    await this.prisma.diaryMedia.updateMany({
      where: { id: { in: media.map((m) => m.id) } },
      data: { deletedAt: new Date(), diaryId: null },
    });
  }

  /** 한도 초과로 거부된 업로드 — R2 파일과 예약 행을 모두 없앤다 */
  private async discardUpload(media: DiaryMedia): Promise<void> {
    await this.safeDeleteFile(media.storageKey);
    await this.prisma.diaryMedia.delete({ where: { id: media.id } });
  }

  /** R2 삭제 실패가 요청 전체를 무너뜨리지 않게 한다 (잔여물은 로그로 추적) */
  private async safeDeleteFile(key: string | null): Promise<void> {
    if (!key) return;

    try {
      await this.storage.deleteFile(key);
    } catch (error) {
      this.logger.error(`R2 파일 삭제 실패 (key=${key}): ${error.message}`);
    }
  }

  private async toMediaDto(media: DiaryMedia): Promise<DiaryMediaDto> {
    return {
      id: media.id,
      type: media.type,
      url: (await this.signKey(media.storageKey)) ?? '',
      thumbnailUrl: await this.signKey(media.thumbnailKey),
      width: media.width,
      height: media.height,
      durationMs: media.durationMs,
      sortOrder: media.sortOrder,
    };
  }

  /**
   * 조회용 URL — 일기는 사적인 내용이라 버킷을 public으로 열지 않고
   * 단기 만료 presigned GET으로 내린다. 서명은 로컬 계산이라 목록 조회에도 부담이 없다.
   */
  private async signKey(key: string | null): Promise<string | null> {
    if (!key) return null;

    const expiresIn = this.config.get<number>('diaryMedia.viewUrlExpiresIn');
    return this.storage.getViewUrl(key, expiresIn);
  }

  private buildStorageKey(userId: string, fileName: string): string {
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
    return `${DIARY_MEDIA_FOLDER}/${userId}/${randomUUID()}${ext ? `.${ext}` : ''}`;
  }

  private async nextSortOrder(diaryId: string): Promise<number> {
    return this.prisma.diaryMedia.count({
      where: { diaryId, deletedAt: null },
    });
  }

  /** 만료된 구독은 free로 취급된다 (구독 상태 판정을 한 곳에서만 하도록 재사용) */
  private async resolveTier(userId: string): Promise<SubscriptionTier> {
    const status = await this.subscription.getStatus(userId);
    return status.tier;
  }

  private quotaErrorKey(quota: MediaQuotaDto): string {
    return quota.monthly.remainingBytes <= quota.total.remainingBytes
      ? 'diary.errors.quota_exceeded'
      : 'diary.errors.total_quota_exceeded';
  }

  /** reserve 시점의 일기 연결 — 지정 ID가 있으면 권한 확인, 없으면 그날 일기를 찾아 붙인다 */
  private async resolveDiaryId(
    userId: string,
    dto: ReserveMediaDto,
  ): Promise<string | null> {
    if (dto.diaryId) {
      const diary = await this.prisma.diary.findFirst({
        where: { id: dto.diaryId, deletedAt: null },
      });

      if (!diary) {
        throw new NotFoundException('diary.errors.diary_not_found');
      }

      await this.validateDiaryEditAccess(userId, diary);
      return diary.id;
    }

    if (!dto.date) return null;

    const diary = await this.prisma.diary.findFirst({
      where: { userId, date: parseDateOnly(dto.date), deletedAt: null },
      select: { id: true },
    });

    return diary?.id ?? null;
  }

  /** 미디어 접근 권한 — 붙어 있는 일기 기준(그룹 일기는 그룹원 전원), 미연결이면 올린 본인만 */
  private async validateMediaAccess(
    userId: string,
    media: { userId: string; diaryId: string | null },
  ): Promise<void> {
    if (media.userId === userId) return;

    if (!media.diaryId) {
      throw new ForbiddenException('diary.errors.no_access');
    }

    const diary = await this.prisma.diary.findFirst({
      where: { id: media.diaryId, deletedAt: null },
    });

    if (!diary) {
      throw new ForbiddenException('diary.errors.no_access');
    }

    await this.validateDiaryEditAccess(userId, diary);
  }

  /** 그룹 일기는 그룹원 전원이 첨부를 추가·삭제할 수 있다 (Phase 1 수정 권한과 동일) */
  private async validateDiaryEditAccess(
    userId: string,
    diary: { userId: string; groupId: string | null },
  ): Promise<void> {
    if (diary.groupId) {
      const member = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: diary.groupId, userId } },
      });

      if (!member) {
        throw new ForbiddenException('diary.errors.no_group_access');
      }
      return;
    }

    if (diary.userId !== userId) {
      throw new ForbiddenException('diary.errors.no_access');
    }
  }

  /** 사용자 단위 락 — 한도 확인과 예약 생성이 겹치지 않게 직렬화한다 */
  private async withQuotaLock<T>(
    userId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const key = quotaLockKey(userId);
    const value = randomUUID();

    for (let attempt = 0; attempt < QUOTA_LOCK_MAX_RETRIES; attempt++) {
      const acquired = await this.redis.acquireLock(
        key,
        QUOTA_LOCK_TTL_SECONDS,
        value,
      );

      if (acquired) {
        try {
          return await fn();
        } finally {
          await this.redis.releaseLock(key, value);
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, QUOTA_LOCK_RETRY_DELAY_MS),
      );
    }

    throw new ServiceUnavailableException('diary.errors.media_busy');
  }
}
