import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateSavingsGoalDto {
  @ApiProperty({
    description: '적립 목표 이름',
    example: '여름 휴가 비용',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '설명',
    example: '7월 제주도 여행 경비',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '목표 금액', example: 1500000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetAmount?: number;

  @ApiProperty({
    description: '자동 적립 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoDeposit?: boolean;

  @ApiProperty({
    description: '매달 자동 적립 금액 (autoDeposit=true 시 필수)',
    example: 150000,
    required: false,
  })
  @ValidateIf((o) => o.autoDeposit === true)
  @IsNumber()
  @Min(1)
  monthlyAmount?: number;
}
