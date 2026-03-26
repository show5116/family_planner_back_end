import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ChildcareRuleType } from '@prisma/client';

export class UpdateRuleDto {
  @ApiProperty({
    description: '규칙 이름',
    example: '숙제하기',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '규칙 설명',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감)',
    enum: ChildcareRuleType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ChildcareRuleType)
  type?: ChildcareRuleType;

  @ApiProperty({
    description: '포인트 (null로 설정 시 포인트 없는 규칙)',
    example: 20,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.points !== null)
  @IsInt()
  @Min(1)
  points?: number | null;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
