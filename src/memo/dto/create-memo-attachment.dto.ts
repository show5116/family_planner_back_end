import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateMemoAttachmentDto {
  @ApiProperty({ description: '파일 이름', example: 'document.pdf' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: '파일 URL' })
  @IsString()
  @MaxLength(500)
  fileUrl: string;

  @ApiProperty({ description: '파일 크기 (bytes)', example: 1024 })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'MIME 타입', example: 'application/pdf' })
  @IsString()
  @MaxLength(100)
  mimeType: string;
}
