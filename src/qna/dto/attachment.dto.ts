import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class AttachmentDto {
  @ApiProperty({ description: '파일 URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: '파일 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  @IsNumber()
  size: number;
}
