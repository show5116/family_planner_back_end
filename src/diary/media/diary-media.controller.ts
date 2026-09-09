import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DiaryMediaService } from './diary-media.service';
import { ReserveMediaDto } from './dto/reserve-media.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { LargeMediaQueryDto } from './dto/large-media-query.dto';
import {
  ConfirmMediaResultDto,
  DiaryMediaDto,
  LargeMediaListDto,
  MediaQuotaDto,
  ReserveMediaResultDto,
} from './dto/diary-media-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
  ApiBadRequest,
  ApiPaymentRequired,
  ApiPayloadTooLarge,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('다이어리 미디어')
@Controller('diaries/media')
@ApiCommonAuthResponses()
export class DiaryMediaController {
  constructor(private readonly mediaService: DiaryMediaService) {}

  @Get('quota')
  @ApiOperation({
    summary: '용량 한도 상태 조회 (업로드 전 필수 — 유효한 예약분 포함)',
  })
  @ApiSuccess(MediaQuotaDto, '한도 조회 성공')
  getQuota(@Request() req) {
    return this.mediaService.getQuota(req.user.userId);
  }

  @Get('large')
  @ApiOperation({ summary: '용량 큰 미디어 조회 (저장공간 관리 화면용)' })
  @ApiSuccess(LargeMediaListDto, '조회 성공')
  findLarge(@Request() req, @Query() query: LargeMediaQueryDto) {
    return this.mediaService.findLarge(req.user.userId, query);
  }

  @Post('reserve')
  @ApiOperation({
    summary: '업로드 예약 — 한도 검증 후 presigned PUT URL 발급',
  })
  @ApiCreated(ReserveMediaResultDto, '예약 성공')
  @ApiBadRequest(
    '지원하지 않는 형식이거나 영상 길이가 너무 깁니다 (길이 초과 시 maxVideoDurationMs 동봉)',
  )
  @ApiPaymentRequired('용량 한도를 초과했습니다 (남은 용량 quota 동봉)')
  @ApiForbidden('현재 요금제에서는 영상을 첨부할 수 없습니다')
  @ApiPayloadTooLarge('파일 하나의 최대 크기를 초과했습니다')
  @ApiNotFound('일기를 찾을 수 없습니다')
  reserve(@Request() req, @Body() dto: ReserveMediaDto) {
    return this.mediaService.reserve(req.user.userId, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '업로드 완료 확정 (실측 크기로 한도 재검증)' })
  @ApiCreated(ConfirmMediaResultDto, '확정 성공')
  @ApiBadRequest('업로드된 파일을 찾을 수 없거나 형식이 다릅니다')
  @ApiPaymentRequired('실측 크기가 용량 한도를 초과했습니다 (R2 파일 삭제됨)')
  @ApiPayloadTooLarge(
    '실측 크기가 파일 최대 크기를 초과했습니다 (R2 파일 삭제됨)',
  )
  @ApiNotFound('첨부를 찾을 수 없습니다')
  confirm(@Request() req, @Param('id') id: string) {
    return this.mediaService.confirm(req.user.userId, id);
  }

  @Patch('reorder')
  @ApiOperation({ summary: '첨부 순서 변경' })
  @ApiSuccess(DiaryMediaDto, '순서 변경 성공')
  @ApiNotFound('첨부를 찾을 수 없습니다')
  reorder(@Request() req, @Body() dto: ReorderMediaDto) {
    return this.mediaService.reorder(req.user.userId, dto.mediaIds);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '미디어 삭제 (R2 즉시 영구 삭제, 누적 한도만 회복)',
  })
  @ApiSuccess(MessageResponseDto, '삭제 성공')
  @ApiNotFound('첨부를 찾을 수 없습니다')
  @ApiForbidden('삭제 권한이 없습니다')
  remove(@Request() req, @Param('id') id: string) {
    return this.mediaService.remove(req.user.userId, id);
  }
}
