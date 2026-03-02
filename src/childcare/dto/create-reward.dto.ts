import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty({ description: '보상 이름', example: 'TV 30분 더보기' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '보상 설명',
    example: 'TV를 30분 추가로 볼 수 있어요',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '포인트 비용', example: 10 })
  @IsInt()
  @Min(1)
  points: number;
}
