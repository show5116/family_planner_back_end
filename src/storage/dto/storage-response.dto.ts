import { ApiProperty } from '@nestjs/swagger';

/**
 * 파일 업로드 응답 DTO
 */
export class FileUploadResponseDto {
  @ApiProperty({
    description: '파일 키 (R2 스토리지 경로)',
    example: 'qna/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  key: string;

  @ApiProperty({
    description: '파일 URL',
    example:
      'https://files.example.com/qna/550e8400-e29b-41d4-a716-446655440000.jpg',
  })
  url: string;
}
