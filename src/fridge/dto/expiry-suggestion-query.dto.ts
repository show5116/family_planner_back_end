import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { StorageType } from '@prisma/client';

export class ExpirySuggestionQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '품목명', example: '시금치' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: '보관 유형 (생략 시 가능한 모든 보관함 추천 반환)',
    enum: StorageType,
    example: StorageType.FRIDGE,
    required: false,
  })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;
}
