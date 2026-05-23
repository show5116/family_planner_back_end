import { ApiProperty } from '@nestjs/swagger';
import { StorageType } from '@prisma/client';

export class ExpirySuggestionDto {
  @ApiProperty({ description: '카테고리', example: '채소' })
  category: string;

  @ApiProperty({ description: '매칭된 키워드', example: '시금치' })
  keyword: string;

  @ApiProperty({
    description: '추천 보관 유형',
    enum: StorageType,
    example: StorageType.FRIDGE,
  })
  storageType: StorageType;

  @ApiProperty({ description: '추천 유통기한 (일)', example: 5 })
  defaultDays: number;

  @ApiProperty({
    description: '추천 만료일 (ISO8601)',
    example: '2026-05-29T00:00:00.000Z',
  })
  suggestedExpiresAt: string;
}

export class GroupExpiryPresetDto {
  @ApiProperty({ description: '프리셋 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '카테고리', example: '채소' })
  category: string;

  @ApiProperty({ description: '보관 유형', example: 'FRIDGE' })
  storageType: string;

  @ApiProperty({ description: '커스텀 유통기한 (일)', example: 7 })
  customDays: number;
}
