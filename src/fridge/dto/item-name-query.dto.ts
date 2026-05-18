import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ItemNameQueryDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({
    example: '우',
    required: false,
    description: '검색어 (부분 일치)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;
}
