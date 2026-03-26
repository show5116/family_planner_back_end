import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ChildcareRuleType } from '@prisma/client';

export class CreateRuleDto {
  @ApiProperty({ description: '규칙 이름', example: '방 정리하기' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '규칙 설명',
    example: '방을 깨끗하게 정리하면 포인트가 지급됩니다',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감)',
    enum: ChildcareRuleType,
    example: ChildcareRuleType.PLUS,
  })
  @IsEnum(ChildcareRuleType)
  type: ChildcareRuleType;

  @ApiProperty({
    description: '포인트 (미지정 시 null)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.points !== null)
  @IsInt()
  @Min(1)
  points?: number | null;
}
