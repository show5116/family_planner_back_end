import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MinigameType } from './create-minigame-result.dto';

export class MinigameQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({
    description: '게임 타입 필터',
    enum: MinigameType,
    required: false,
  })
  @IsOptional()
  @IsEnum(MinigameType)
  gameType?: MinigameType;

  @ApiProperty({
    description: '조회 개수',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    description: '오프셋',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
