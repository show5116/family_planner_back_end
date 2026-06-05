import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { LinkPreviewService } from './link-preview.service';
import { LinkPreviewDto } from './dto/link-preview-response.dto';
import {
  ApiSuccess,
  ApiBadRequest,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';

class LinkPreviewQueryDto {
  @ApiProperty({
    description: '미리보기를 가져올 URL',
    example: 'https://example.com',
  })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;
}

@ApiTags('링크 프리뷰')
@Controller('link-preview')
@ApiCommonAuthResponses()
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Get()
  @ApiOperation({ summary: 'URL 링크 미리보기 (OG 태그 파싱)' })
  @ApiSuccess(LinkPreviewDto, '링크 미리보기 성공')
  @ApiBadRequest('유효하지 않은 URL입니다')
  @ApiForbidden('내부 네트워크 주소는 허용되지 않습니다')
  getPreview(@Query() query: LinkPreviewQueryDto) {
    return this.linkPreviewService.getPreview(query.url);
  }
}
