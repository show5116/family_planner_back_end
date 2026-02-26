import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ConfirmReceiptDto {
  @ApiProperty({
    description: '업로드된 파일 키 (getReceiptUploadUrl 응답의 fileKey)',
    example: 'receipts/uuid-1234.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ description: '원본 파일명', example: 'receipt.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: '파일 크기 (bytes)', example: 102400 })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
