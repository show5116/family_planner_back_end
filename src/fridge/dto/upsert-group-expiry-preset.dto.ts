import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class UpsertGroupExpiryPresetDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '글로벌 프리셋 ID', example: 'uuid-5678' })
  @IsUUID()
  globalPresetId: string;

  @ApiProperty({ description: '커스텀 유통기한 (일)', example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  customDays: number;
}
