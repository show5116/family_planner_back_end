import { MediaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * 사용자별 "실제 저장된" 다이어리 미디어 바이트 합
 *
 * ★ DiaryMediaQuotaService의 누적 게이지와 **일부러 다르다.**
 *   그쪽은 아직 올라오지 않은 PENDING 예약분까지 더해 한도를 막는다 — 돈이 걸린 판정이라
 *   업로드 중인 것도 미리 잡아야 하기 때문이다. 여기는 관리자 화면·알림 문구용이라
 *   R2에 실제로 올라가 있는 것만 센다. 최대 15분짜리 예약분만큼 게이지보다 작을 수 있다.
 *
 *   집계 조건(CONFIRMED + 미삭제)은 양쪽이 같아야 하므로 이 함수를 공용으로 둔다.
 *   `SubscriptionModule`이 `DiaryModule`을 import하면 순환이라 서비스가 아니라 유틸이다.
 */
export async function sumStoredMediaBytes(
  db: Db,
  userIds: string[],
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const rows = await db.diaryMedia.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      status: MediaStatus.CONFIRMED,
      deletedAt: null,
    },
    _sum: { fileSize: true },
  });

  return new Map(rows.map((row) => [row.userId, row._sum.fileSize ?? 0]));
}

/**
 * 미디어를 1건이라도 올린 모든 사용자의 저장 바이트 합
 *
 * 분포 통계용이다. 대상을 "미디어가 있는 사용자"로 좁혀 전체 사용자 수와 무관하게
 * 결과 크기가 실제 사용자 수만큼만 커지도록 한다.
 */
export async function sumStoredMediaBytesForAll(
  db: Db,
): Promise<Map<string, number>> {
  const rows = await db.diaryMedia.groupBy({
    by: ['userId'],
    where: { status: MediaStatus.CONFIRMED, deletedAt: null },
    _sum: { fileSize: true },
  });

  return new Map(rows.map((row) => [row.userId, row._sum.fileSize ?? 0]));
}
