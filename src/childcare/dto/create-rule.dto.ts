import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRuleDto {
  @ApiProperty({ description: '규칙 이름', example: '방 정리 안함' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '규칙 설명',
    example: '방을 정리하지 않으면 포인트가 차감됩니다',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '차감 포인트', example: 10 })
  @IsInt()
  @Min(1)
  penalty: number;
}
