import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ description: '적립 목표 이름', example: '여름 휴가 비용' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '설명',
    example: '7월 제주도 여행 경비',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '목표 금액 (미설정 시 무기한 적립)',
    example: 1000000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetAmount?: number;

  @ApiProperty({
    description: '자동 적립 여부',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoDeposit?: boolean;

  @ApiProperty({
    description: '매달 자동 적립 금액 (autoDeposit=true 시 필수)',
    example: 100000,
    required: false,
  })
  @ValidateIf((o) => o.autoDeposit === true)
  @IsNumber()
  @Min(1)
  monthlyAmount?: number;

  @ApiProperty({
    description:
      '자산 통계 연동 여부 (true 시 GET /assets/statistics에 잔액 포함)',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeInAssets?: boolean;
}
