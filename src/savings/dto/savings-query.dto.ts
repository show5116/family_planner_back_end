import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

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
}
