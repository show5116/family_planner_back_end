import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { StorageType } from '@prisma/client';

export class UpsertGroupExpiryPresetDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '카테고리', example: '채소' })
  @IsString()
  category: string;

  @ApiProperty({
    description: '보관 유형',
    enum: StorageType,
    example: StorageType.FRIDGE,
  })
  @IsEnum(StorageType)
  storageType: StorageType;

  @ApiProperty({ description: '커스텀 유통기한 (일)', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  customDays: number;
}
