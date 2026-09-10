import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ConfirmReceiptDto {
  @ApiProperty({
    description:
      '업로드된 파일 키 (getReceiptUploadUrl 응답의 fileKey 그대로). 해당 지출에 발급된 키가 아니면 400',
    example: 'receipts/expense-uuid/file-uuid.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ description: '원본 파일명', example: 'receipt.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: '파일 크기 (bytes) — 참고용. 서버가 실측값으로 덮어쓴다',
    example: 102400,
  })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({
    description:
      'MIME 타입 — 참고용. 서버가 매직바이트로 판별한 값으로 덮어쓴다',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
