import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AccountQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({
    description: '특정 구성원 ID 필터',
    example: 'uuid-5678',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
