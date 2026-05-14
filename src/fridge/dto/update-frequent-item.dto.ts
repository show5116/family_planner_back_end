import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFrequentItemDto {
  @ApiProperty({ example: '우유', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: '개', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  defaultUnit?: string | null;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  autoAdd?: boolean;
}
