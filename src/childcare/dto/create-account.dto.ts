import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, Min, Max } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '자녀 사용자 ID', example: 'uuid-1234' })
  @IsString()
  childUserId: string;

  @ApiProperty({ description: '월별 용돈 포인트', example: 100 })
  @IsInt()
  @Min(0)
  monthlyAllowance: number;

  @ApiProperty({ description: '적금 이자율 (%)', example: 2.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  savingsInterestRate: number;
}
