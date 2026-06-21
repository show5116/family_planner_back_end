import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MilestoneConfigDto {
  @ApiPropertyOptional({
    description: '100일 단위 milestone 생성 여부 (100일, 200일, 300일...)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  every100Days?: boolean;

  @ApiPropertyOptional({
    description: '매년 주년 milestone 생성 여부 (1주년, 2주년...)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  everyYear?: boolean;
}

export class CreateAnniversaryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: '기념일 이름', example: '연애 시작일' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: '기념일 날짜 (YYYY-MM-DD)',
    example: '2023-01-01',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: '이모지', example: '💑' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({
    description: 'milestone Task 자동 생성 설정',
    type: MilestoneConfigDto,
  })
  @ValidateNested()
  @Type(() => MilestoneConfigDto)
  @IsOptional()
  milestoneConfig?: MilestoneConfigDto;
}
