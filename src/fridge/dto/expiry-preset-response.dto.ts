import { ApiProperty } from '@nestjs/swagger';
import { StorageType } from '@prisma/client';

export class ExpiryPresetDto {
  @ApiProperty({ description: '카테고리', example: '채소' })
  category: string;

  @ApiProperty({
    description: '보관 유형',
    enum: StorageType,
    example: StorageType.FRIDGE,
  })
  storageType: StorageType;

  @ApiProperty({
    description: '적용 유통기한 (일) - 커스텀이 있으면 커스텀, 없으면 글로벌',
    example: 7,
  })
  days: number;

  @ApiProperty({
    description:
      '매칭 키워드 목록 (클라이언트 로컬 매칭용, 글로벌 항목에만 존재)',
    example: ['시금치', '열무'],
    type: [String],
    nullable: true,
  })
  keywords: string[] | null;

  @ApiProperty({ description: '그룹 커스텀 여부', example: false })
  isCustom: boolean;

  @ApiProperty({
    description: '그룹 커스텀 프리셋 ID (커스텀인 경우에만 존재)',
    example: 'uuid-1234',
    nullable: true,
  })
  customPresetId: string | null;
}
