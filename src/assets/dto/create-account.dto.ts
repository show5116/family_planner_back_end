import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ description: '금융기관명', example: '국민은행' })
  @IsString()
  institution: string;

  @ApiProperty({
    description: '계좌 유형',
    enum: AccountType,
    example: AccountType.SAVINGS,
  })
  @IsEnum(AccountType)
  type: AccountType;
}
