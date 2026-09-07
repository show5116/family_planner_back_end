import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { AppendDiaryDto } from './dto/append-diary.dto';
import { DiaryCalendarQueryDto, DiaryQueryDto } from './dto/diary-query.dto';
import {
  AppendDiaryResultDto,
  DiaryCalendarDto,
  DiaryDto,
  DiaryFlashbackDto,
  DiaryStreakDto,
  PaginatedDiaryDto,
} from './dto/diary-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
  ApiConflict,
  ApiBadRequest,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('다이어리')
@Controller('diaries')
@ApiCommonAuthResponses()
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  @ApiOperation({ summary: '일기 생성' })
  @ApiCreated(DiaryDto, '일기 생성 성공')
  @ApiBadRequest('본문이 없거나 미래 날짜입니다')
  @ApiConflict('해당 날짜에 이미 일기가 있습니다')
  create(@Request() req, @Body() dto: CreateDiaryDto) {
    return this.diaryService.create(req.user.userId, dto);
  }

  @Post('append')
  @ApiOperation({
    summary: '빠른 기록 (그날 일기에 조각 append — 없으면 생성)',
  })
  @ApiCreated(AppendDiaryResultDto, '빠른 기록 성공')
  @ApiBadRequest('텍스트가 비어 있거나 미래 날짜입니다')
  appendFragment(@Request() req, @Body() dto: AppendDiaryDto) {
    return this.diaryService.append(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '일기 목록 조회' })
  @ApiSuccess(PaginatedDiaryDto, '일기 목록 조회 성공')
  findAll(@Request() req, @Query() query: DiaryQueryDto) {
    return this.diaryService.findAll(req.user.userId, query);
  }

  @Get('calendar')
  @ApiOperation({ summary: '월별 작성 현황 조회 (캘린더뷰용)' })
  @ApiSuccess(DiaryCalendarDto, '월별 작성 현황 조회 성공')
  @ApiForbidden('그룹에 접근할 권한이 없습니다')
  findCalendar(@Request() req, @Query() query: DiaryCalendarQueryDto) {
    return this.diaryService.findCalendar(req.user.userId, query);
  }

  @Get('streak')
  @ApiOperation({ summary: '연속 작성일수 조회 (하루 경계 = 새벽 4시)' })
  @ApiSuccess(DiaryStreakDto, '연속 작성일수 조회 성공')
  getStreak(@Request() req) {
    return this.diaryService.getStreak(req.user.userId);
  }

  @Get('flashback')
  @ApiOperation({ summary: '회고 조회 (1·3·6개월, n년 전 오늘)' })
  @ApiSuccess(DiaryFlashbackDto, '회고 조회 성공')
  getFlashback(@Request() req) {
    return this.diaryService.getFlashback(req.user.userId);
  }

  @Get('by-date/:date')
  @ApiOperation({ summary: "특정 날짜의 내 일기 조회 ('YYYY-MM-DD')" })
  @ApiSuccess(DiaryDto, '일기 조회 성공')
  @ApiNotFound('해당 날짜의 일기를 찾을 수 없습니다')
  findByDate(@Request() req, @Param('date') date: string) {
    return this.diaryService.findByDate(req.user.userId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: '일기 상세 조회' })
  @ApiSuccess(DiaryDto, '일기 상세 조회 성공')
  @ApiNotFound('일기를 찾을 수 없습니다')
  @ApiForbidden('일기에 접근할 권한이 없습니다')
  findOne(@Request() req, @Param('id') id: string) {
    return this.diaryService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '일기 수정' })
  @ApiSuccess(DiaryDto, '일기 수정 성공')
  @ApiNotFound('일기를 찾을 수 없습니다')
  @ApiForbidden('본인의 일기만 수정할 수 있습니다')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateDiaryDto) {
    return this.diaryService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '일기 삭제 (soft delete, 30일 내 복구 가능)' })
  @ApiSuccess(MessageResponseDto, '일기 삭제 성공')
  @ApiNotFound('일기를 찾을 수 없습니다')
  @ApiForbidden('본인의 일기만 삭제할 수 있습니다')
  remove(@Request() req, @Param('id') id: string) {
    return this.diaryService.remove(req.user.userId, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '삭제한 일기 복구 (30일 이내)' })
  @ApiCreated(DiaryDto, '일기 복구 성공')
  @ApiNotFound('복구할 일기를 찾을 수 없거나 복구 기간이 지났습니다')
  @ApiForbidden('본인의 일기만 복구할 수 있습니다')
  @ApiConflict('해당 날짜에 이미 일기가 있습니다')
  restore(@Request() req, @Param('id') id: string) {
    return this.diaryService.restore(req.user.userId, id);
  }
}
