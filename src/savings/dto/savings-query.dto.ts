import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { SavingsType } from '@prisma/client';

export class SavingsGoalQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;
}

export class TransactionQueryDto {
  @ApiProperty({ description: '페이지 번호', example: '1', required: false })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiProperty({ description: '페이지 크기', example: '20', required: false })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiProperty({
    description: '내역 타입 필터',
    enum: SavingsType,
    required: false,
  })
  @IsOptional()
  @IsEnum(SavingsType)
  type?: SavingsType;
}
