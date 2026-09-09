import { ApiProperty } from '@nestjs/swagger';
import { MediaType, SubscriptionTier } from '@prisma/client';

export class MediaQuotaMonthlyDto {
  @ApiProperty({ description: '이번 달 사용량 (bytes, 유효 예약분 포함)' })
  usedBytes: number;

  @ApiProperty({ description: '이번 달 한도 (bytes)' })
  limitBytes: number;

  @ApiProperty({ description: '이번 달 잔여 (bytes)' })
  remainingBytes: number;

  @ApiProperty({ description: '월간 한도 리셋 시각 (다음 달 1일 04:00 KST)' })
  resetsAt: Date;
}

export class MediaQuotaTotalDto {
  @ApiProperty({ description: '누적 사용량 (bytes, 유효 예약분 포함)' })
  usedBytes: number;

  @ApiProperty({ description: '누적 한도 (bytes)' })
  limitBytes: number;

  @ApiProperty({ description: '누적 잔여 (bytes)' })
  remainingBytes: number;
}

export class MediaQuotaDto {
  @ApiProperty({ description: '구독 등급', enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty({ description: '월간 한도 상태', type: MediaQuotaMonthlyDto })
  monthly: MediaQuotaMonthlyDto;

  @ApiProperty({ description: '누적 한도 상태', type: MediaQuotaTotalDto })
  total: MediaQuotaTotalDto;

  @ApiProperty({ description: '파일 1개 최대 크기 (bytes)' })
  perFileLimitBytes: number;

  @ApiProperty({ description: '영상 첨부 가능 여부' })
  videoAllowed: boolean;

  @ApiProperty({ description: '영상 최대 길이 (ms)', nullable: true })
  maxVideoDurationMs: number | null;
}

export class DiaryMediaDto {
  @ApiProperty({ description: '미디어 ID' })
  id: string;

  @ApiProperty({ description: '미디어 종류', enum: MediaType })
  type: MediaType;

  @ApiProperty({ description: '조회용 URL (단기 만료 presigned GET)' })
  url: string;

  @ApiProperty({ description: '썸네일 URL', nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ description: '가로 픽셀', nullable: true })
  width: number | null;

  @ApiProperty({ description: '세로 픽셀', nullable: true })
  height: number | null;

  @ApiProperty({ description: '영상 길이 (ms)', nullable: true })
  durationMs: number | null;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder: number;
}

export class ReserveMediaResultDto {
  @ApiProperty({ description: '미디어 ID (confirm에 사용)' })
  mediaId: string;

  @ApiProperty({ description: 'R2 직접 업로드용 presigned PUT URL' })
  uploadUrl: string;

  @ApiProperty({ description: 'R2 저장 키' })
  storageKey: string;

  @ApiProperty({ description: 'presigned URL 유효 시간 (초)' })
  expiresIn: number;

  @ApiProperty({
    description:
      '썸네일 업로드용 presigned PUT URL (JPEG, 최대 변 640px, 품질 80). 선택 — 올리지 않아도 확정된다',
  })
  thumbnailUploadUrl: string;

  @ApiProperty({ description: '썸네일 R2 저장 키' })
  thumbnailKey: string;
}

export class ConfirmMediaResultDto {
  @ApiProperty({ description: '확정된 미디어', type: DiaryMediaDto })
  media: DiaryMediaDto;

  @ApiProperty({ description: '갱신된 한도 상태', type: MediaQuotaDto })
  quota: MediaQuotaDto;
}

export class LargeMediaItemDto {
  @ApiProperty({ description: '미디어 ID' })
  id: string;

  @ApiProperty({ description: '연결된 일기 ID', nullable: true })
  diaryId: string | null;

  @ApiProperty({ description: "일기 날짜 ('YYYY-MM-DD')", nullable: true })
  date: string | null;

  @ApiProperty({ description: '미디어 종류', enum: MediaType })
  type: MediaType;

  @ApiProperty({ description: '파일명' })
  fileName: string;

  @ApiProperty({ description: '실제 크기 (bytes)' })
  fileSize: number;

  @ApiProperty({ description: '압축 전 원본 크기 (bytes)', nullable: true })
  originalSize: number | null;

  @ApiProperty({ description: '원본으로 업로드했는지' })
  isOriginal: boolean;

  @ApiProperty({ description: '썸네일 URL', nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ description: '업로드 확정 시각', nullable: true })
  uploadedAt: Date | null;
}

export class LargeMediaListDto {
  @ApiProperty({
    description: '용량 큰 미디어 목록',
    type: [LargeMediaItemDto],
  })
  items: LargeMediaItemDto[];
}

export class MediaQuotaPlanDto {
  @ApiProperty({ description: '구독 등급', enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty({ description: '월간 업로드 한도 (bytes)' })
  monthlyBytes: number;

  @ApiProperty({ description: '계정 누적 한도 (bytes)' })
  totalBytes: number;

  @ApiProperty({ description: '파일 1개 최대 크기 (bytes)' })
  perFileBytes: number;

  @ApiProperty({ description: '영상 첨부 가능 여부' })
  videoAllowed: boolean;

  @ApiProperty({ description: '영상 최대 길이 (ms)', nullable: true })
  maxVideoDurationMs: number | null;
}

export class MediaQuotaPlanListDto {
  @ApiProperty({ description: '등급별 한도표', type: [MediaQuotaPlanDto] })
  plans: MediaQuotaPlanDto[];
}
