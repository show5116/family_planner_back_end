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

import { RoutineService } from './routine.service';
import { RoutineStatsService } from './routine-stats.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import { CheckRoutineDto } from './dto/check-routine.dto';
import { CreateRoutineShareDto } from './dto/create-routine-share.dto';
import { ReorderRoutineDto } from './dto/reorder-routine.dto';
import { HeatmapQueryDto, RateQueryDto } from './dto/routine-stats-query.dto';
import {
  RoutineDto,
  RoutineLogDto,
  RoutineShareDto,
  RoutineMemberSummaryDto,
} from './dto/routine-response.dto';
import {
  HeatmapResponseDto,
  StreakResponseDto,
  RateResponseDto,
  RoutineSummaryDto,
} from './dto/routine-stats-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
  ApiConflict,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('루틴')
@Controller('routines')
@ApiCommonAuthResponses()
export class RoutineController {
  constructor(
    private readonly routineService: RoutineService,
    private readonly routineStatsService: RoutineStatsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '루틴 생성' })
  @ApiCreated(RoutineDto, '루틴 생성 성공')
  create(@Request() req, @Body() dto: CreateRoutineDto) {
    return this.routineService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 루틴 목록 조회' })
  @ApiSuccess(RoutineDto, '루틴 목록 조회 성공', { isArray: true })
  findAll(@Request() req, @Query() query: RoutineQueryDto) {
    return this.routineService.findAll(req.user.userId, query);
  }

  @Get('stats/summary')
  @ApiOperation({
    summary: '대시보드 위젯용 루틴 요약 (오늘 체크 현황 + 스트릭)',
  })
  @ApiSuccess(RoutineSummaryDto, '루틴 요약 조회 성공')
  getSummary(@Request() req) {
    return this.routineStatsService.getSummary(req.user.userId);
  }

  @Get('groups/:groupId/members')
  @ApiOperation({
    summary: '그룹에 공유된 멤버별 루틴 + 오늘/이번주 달성 현황 조회',
  })
  @ApiSuccess(RoutineMemberSummaryDto, '그룹원 루틴 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('그룹 멤버가 아닙니다')
  findGroupMembers(@Request() req, @Param('groupId') groupId: string) {
    return this.routineService.findGroupMembers(req.user.userId, groupId);
  }

  @Get('groups/:groupId/members/:userId')
  @ApiOperation({ summary: '특정 그룹원의 공유 루틴 상세 조회' })
  @ApiSuccess(RoutineDto, '그룹원 루틴 상세 조회 성공', { isArray: true })
  @ApiForbidden('그룹 멤버가 아닙니다')
  findGroupMemberDetail(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.routineService.findGroupMemberDetail(
      req.user.userId,
      groupId,
      userId,
    );
  }

  @Patch('sort-order')
  @ApiOperation({ summary: '루틴 순서 일괄 변경' })
  @ApiSuccess(RoutineDto, '순서 변경 성공', { isArray: true })
  reorder(@Request() req, @Body() dto: ReorderRoutineDto) {
    return this.routineService.reorder(req.user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '루틴 상세 조회 (본인 또는 공유 그룹원)' })
  @ApiSuccess(RoutineDto, '루틴 상세 조회 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('루틴에 접근할 권한이 없습니다')
  findOne(@Request() req, @Param('id') id: string) {
    return this.routineService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '루틴 수정' })
  @ApiSuccess(RoutineDto, '루틴 수정 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 수정할 수 있습니다')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routineService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '루틴 삭제 (soft delete, 체크 기록은 보존)' })
  @ApiSuccess(MessageResponseDto, '루틴 삭제 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 삭제할 수 있습니다')
  remove(@Request() req, @Param('id') id: string) {
    return this.routineService.remove(req.user.userId, id);
  }

  @Post(':id/check')
  @ApiOperation({ summary: '루틴 체크 (날짜 미지정 시 오늘)' })
  @ApiCreated(RoutineLogDto, '체크 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiConflict('이미 체크된 날짜입니다')
  check(@Request() req, @Param('id') id: string, @Body() dto: CheckRoutineDto) {
    return this.routineService.check(req.user.userId, id, dto);
  }

  @Delete(':id/check')
  @ApiOperation({ summary: '루틴 체크 취소 (날짜 미지정 시 오늘)' })
  @ApiSuccess(MessageResponseDto, '체크 취소 성공')
  @ApiNotFound('체크 기록을 찾을 수 없습니다')
  uncheck(
    @Request() req,
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    return this.routineService.uncheck(req.user.userId, id, date);
  }

  @Post(':id/shares')
  @ApiOperation({ summary: '그룹에 루틴 공유' })
  @ApiCreated(RoutineShareDto, '공유 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 공유할 수 있습니다')
  @ApiConflict('이미 공유된 그룹입니다')
  addShare(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateRoutineShareDto,
  ) {
    return this.routineService.addShare(req.user.userId, id, dto);
  }

  @Delete(':id/shares/:groupId')
  @ApiOperation({ summary: '그룹 공유 해제' })
  @ApiSuccess(MessageResponseDto, '공유 해제 성공')
  @ApiNotFound('공유 정보를 찾을 수 없습니다')
  removeShare(
    @Request() req,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.routineService.removeShare(req.user.userId, id, groupId);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: '루틴이 공유된 그룹 목록 조회' })
  @ApiSuccess(RoutineShareDto, '공유 그룹 목록 조회 성공', { isArray: true })
  @ApiForbidden('본인의 루틴만 조회할 수 있습니다')
  findShares(@Request() req, @Param('id') id: string) {
    return this.routineService.findShares(req.user.userId, id);
  }

  @Get(':id/stats/heatmap')
  @ApiOperation({ summary: '루틴 달력 히트맵 (날짜별 달성 여부)' })
  @ApiSuccess(HeatmapResponseDto, '히트맵 조회 성공')
  getHeatmap(
    @Request() req,
    @Param('id') id: string,
    @Query() query: HeatmapQueryDto,
  ) {
    return this.routineStatsService.getHeatmap(req.user.userId, id, query);
  }

  @Get(':id/stats/streak')
  @ApiOperation({ summary: '루틴 스트릭 조회 (현재/최장, 주 단위 + 일 단위)' })
  @ApiSuccess(StreakResponseDto, '스트릭 조회 성공')
  getStreak(@Request() req, @Param('id') id: string) {
    return this.routineStatsService.getStreak(req.user.userId, id);
  }

  @Get(':id/stats/rate')
  @ApiOperation({ summary: '루틴 기간별 달성률 조회' })
  @ApiSuccess(RateResponseDto, '달성률 조회 성공')
  getRate(
    @Request() req,
    @Param('id') id: string,
    @Query() query: RateQueryDto,
  ) {
    return this.routineStatsService.getRate(req.user.userId, id, query);
  }
}
