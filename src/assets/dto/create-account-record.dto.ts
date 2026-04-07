import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export enum RecordInputMode {
  MANUAL = 'manual',
  AUTO = 'auto',
}

export class CreateAccountRecordDto {
  @ApiProperty({ description: '기록 날짜 (YYYY-MM-DD)', example: '2026-03-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '날짜 형식은 YYYY-MM-DD이어야 합니다',
  })
  recordDate: string;

  @ApiProperty({
    description: '입력 방식 (manual: 직접 입력, auto: 자동 계산)',
    enum: RecordInputMode,
    example: RecordInputMode.AUTO,
    default: RecordInputMode.MANUAL,
  })
  @IsOptional()
  @IsEnum(RecordInputMode)
  inputMode?: RecordInputMode;

  // ─── manual 모드 필드 ────────────────────────────────────────

  @ApiProperty({
    description: '[manual] 잔액',
    example: 5000000,
    required: false,
  })
  @ValidateIf((o) => !o.inputMode || o.inputMode === RecordInputMode.MANUAL)
  @IsNumber()
  @Min(0)
  balance?: number;

  @ApiProperty({
    description: '[manual] 원금',
    example: 4800000,
    required: false,
  })
  @ValidateIf((o) => !o.inputMode || o.inputMode === RecordInputMode.MANUAL)
  @IsNumber()
  @Min(0)
  principal?: number;

  @ApiProperty({
    description: '[manual] 수익금',
    example: 200000,
    required: false,
  })
  @ValidateIf((o) => !o.inputMode || o.inputMode === RecordInputMode.MANUAL)
  @IsNumber()
  profit?: number;

  // ─── auto 모드 필드 ─────────────────────────────────────────

  @ApiProperty({
    description: '[auto] 현재 잔액',
    example: 5000000,
    required: false,
  })
  @ValidateIf((o) => o.inputMode === RecordInputMode.AUTO)
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @ApiProperty({
    description: '[auto] 이번 달 추가 원금 (첫 기록이면 초기 원금)',
    example: 300000,
    required: false,
  })
  @ValidateIf((o) => o.inputMode === RecordInputMode.AUTO)
  @IsNumber()
  @Min(0)
  additionalPrincipal?: number;

  @ApiProperty({
    description: '메모',
    example: '이자 입금',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
