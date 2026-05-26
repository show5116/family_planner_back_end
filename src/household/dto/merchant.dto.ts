import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({
    description: '그룹 ID (개인 소비처 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '소비처 이름', example: '쿠팡' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;
}

export class UpdateMerchantDto {
  @ApiProperty({ description: '소비처 이름', example: '쿠팡', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class MerchantQueryDto {
  @ApiProperty({
    description: '그룹 ID (개인 소비처 조회 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;
}
