import { ApiProperty } from '@nestjs/swagger';
import { StorageType } from '@prisma/client';

export class ExpiryPresetDto {
  @ApiProperty({ description: '글로벌 프리셋 ID', example: 'uuid-1234' })
  globalPresetId: string;

  @ApiProperty({ description: '카테고리', example: '채소' })
  category: string;

  @ApiProperty({ description: '품목 키워드', example: '사과' })
  keyword: string;

  @ApiProperty({
    description: '보관 유형',
    enum: StorageType,
    example: StorageType.FRIDGE,
  })
  storageType: StorageType;

  @ApiProperty({
    description: '적용 유통기한 (일) - 커스텀이 있으면 커스텀, 없으면 글로벌',
    example: 30,
  })
  days: number;

  @ApiProperty({ description: '그룹 커스텀 여부', example: false })
  isCustom: boolean;

  @ApiProperty({
    description: '그룹 커스텀 프리셋 ID (커스텀인 경우에만 존재)',
    example: 'uuid-5678',
    nullable: true,
  })
  customPresetId: string | null;
}
