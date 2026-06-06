import { ApiProperty } from '@nestjs/swagger';

export class LinkPreviewDto {
  @ApiProperty({
    description: '요청한 URL',
    example: 'https://example.com/article',
  })
  url: string;

  @ApiProperty({
    description: '페이지 제목',
    nullable: true,
    example: '페이지 제목',
  })
  title: string | null;

  @ApiProperty({
    description: '페이지 설명',
    nullable: true,
    example: '페이지 설명',
  })
  description: string | null;

  @ApiProperty({
    description: 'OG 이미지 URL',
    nullable: true,
    example: 'https://example.com/og.jpg',
  })
  image: string | null;

  @ApiProperty({ description: '사이트명', nullable: true, example: 'Example' })
  siteName: string | null;
}
