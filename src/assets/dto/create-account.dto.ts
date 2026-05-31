import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '계좌명', example: '주택청약' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '계좌번호',
    example: '123-456-789',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({
    description: '금융기관명',
    example: '국민은행',
    required: false,
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiProperty({
    description: '계좌 유형',
    enum: AccountType,
    example: AccountType.SAVINGS,
  })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({
    description: '자산 기록 입력 알림 일자 (1~31, null이면 알림 없음)',
    example: 1,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  recordReminderDay?: number | null;
}
