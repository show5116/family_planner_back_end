import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShopItemDto {
  @ApiProperty({
    description: '상점 아이템 이름',
    example: 'TV 1시간 더보기',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '상점 아이템 설명',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '포인트 비용',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
