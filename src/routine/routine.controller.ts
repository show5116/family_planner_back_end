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
import { RoutineBadgeService } from './routine-badge.service';
import { RoutineLeaderboardService } from './routine-leaderboard.service';
import { RoutineGroupService } from './routine-group.service';
import { RoutineCategoryService } from './routine-category.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import { CheckRoutineDto } from './dto/check-routine.dto';
import { CreateRoutineShareDto } from './dto/create-routine-share.dto';
import { CreateRoutineCategoryLinkDto } from './dto/create-routine-category-link.dto';
import { ReorderRoutineDto } from './dto/reorder-routine.dto';
import { CreateRoutineGroupDto } from './dto/create-routine-group.dto';
import { UpdateRoutineGroupDto } from './dto/update-routine-group.dto';
import { ReorderRoutineGroupDto } from './dto/reorder-routine-group.dto';
import { CreateRoutineCategoryDto } from './dto/create-routine-category.dto';
import { UpdateRoutineCategoryDto } from './dto/update-routine-category.dto';
import { ReorderRoutineCategoryDto } from './dto/reorder-routine-category.dto';
import {
  HeatmapQueryDto,
  RateQueryDto,
  OverviewQueryDto,
} from './dto/routine-stats-query.dto';
import { LeaderboardQueryDto } from './dto/routine-leaderboard-query.dto';
import {
  RoutineDto,
  RoutineLogDto,
  RoutineShareDto,
  RoutineCategoryLinkDto,
  RoutineMemberSummaryDto,
} from './dto/routine-response.dto';
import {
  RoutineGroupDto,
  RoutineGroupDetailDto,
} from './dto/routine-group-response.dto';
import {
  RoutineCategoryDto,
  RoutineCategoryDetailDto,
} from './dto/routine-category-response.dto';
import {
  HeatmapResponseDto,
  StreakResponseDto,
  RateResponseDto,
  RoutineSummaryDto,
  RoutineOverviewDto,
} from './dto/routine-stats-response.dto';
import {
  RoutineBadgeDto,
  UserRoutineBadgeDto,
} from './dto/routine-badge-response.dto';
import { LeaderboardResponseDto } from './dto/routine-leaderboard-response.dto';
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
    private readonly routineBadgeService: RoutineBadgeService,
    private readonly routineLeaderboardService: RoutineLeaderboardService,
    private readonly routineGroupService: RoutineGroupService,
    private readonly routineCategoryService: RoutineCategoryService,
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

  @Get('stats/overview')
  @ApiOperation({
    summary: '전체 루틴 대시보드 요약 (달성률 + 날짜별 히트맵)',
  })
  @ApiSuccess(RoutineOverviewDto, '전체 루틴 개요 조회 성공')
  getOverview(@Request() req, @Query() query: OverviewQueryDto) {
    return this.routineStatsService.getOverview(req.user.userId, query);
  }

  @Get('badges')
  @ApiOperation({ summary: '전체 배지 카탈로그 조회 (활성 배지만)' })
  @ApiSuccess(RoutineBadgeDto, '배지 카탈로그 조회 성공', { isArray: true })
  getBadgeCatalog() {
    return this.routineBadgeService.findCatalog();
  }

  @Post('categories')
  @ApiOperation({ summary: '루틴 카테고리 생성 (사용자 커스텀 태그)' })
  @ApiCreated(RoutineCategoryDto, '루틴 카테고리 생성 성공')
  createCategory(@Request() req, @Body() dto: CreateRoutineCategoryDto) {
    return this.routineCategoryService.create(req.user.userId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: '내 루틴 카테고리 목록 조회' })
  @ApiSuccess(RoutineCategoryDto, '루틴 카테고리 목록 조회 성공', {
    isArray: true,
  })
  findCategories(@Request() req) {
    return this.routineCategoryService.findAll(req.user.userId);
  }

  @Patch('categories/sort-order')
  @ApiOperation({ summary: '루틴 카테고리 순서 일괄 변경' })
  @ApiSuccess(RoutineCategoryDto, '순서 변경 성공', { isArray: true })
  reorderCategories(@Request() req, @Body() dto: ReorderRoutineCategoryDto) {
    return this.routineCategoryService.reorder(req.user.userId, dto);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: '루틴 카테고리 상세 조회 (소속 습관 목록 포함)' })
  @ApiSuccess(RoutineCategoryDetailDto, '루틴 카테고리 상세 조회 성공')
  @ApiNotFound('루틴 카테고리를 찾을 수 없습니다')
  @ApiForbidden('본인의 카테고리만 조회할 수 있습니다')
  findCategoryOne(@Request() req, @Param('id') id: string) {
    return this.routineCategoryService.findOne(req.user.userId, id);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: '루틴 카테고리 수정' })
  @ApiSuccess(RoutineCategoryDto, '루틴 카테고리 수정 성공')
  @ApiNotFound('루틴 카테고리를 찾을 수 없습니다')
  @ApiForbidden('본인의 카테고리만 수정할 수 있습니다')
  updateCategory(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineCategoryDto,
  ) {
    return this.routineCategoryService.update(req.user.userId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({
    summary: '루틴 카테고리 삭제 (soft delete, 소속 습관은 카테고리만 해제)',
  })
  @ApiSuccess(MessageResponseDto, '루틴 카테고리 삭제 성공')
  @ApiNotFound('루틴 카테고리를 찾을 수 없습니다')
  @ApiForbidden('본인의 카테고리만 삭제할 수 있습니다')
  removeCategory(@Request() req, @Param('id') id: string) {
    return this.routineCategoryService.remove(req.user.userId, id);
  }

  @Post('routine-groups')
  @ApiOperation({ summary: '루틴 그룹 생성 (여러 습관을 묶는 그룹)' })
  @ApiCreated(RoutineGroupDto, '루틴 그룹 생성 성공')
  createRoutineGroup(@Request() req, @Body() dto: CreateRoutineGroupDto) {
    return this.routineGroupService.create(req.user.userId, dto);
  }

  @Get('routine-groups')
  @ApiOperation({ summary: '내 루틴 그룹 목록 조회 (그룹별 오늘 진행률 포함)' })
  @ApiSuccess(RoutineGroupDto, '루틴 그룹 목록 조회 성공', { isArray: true })
  findRoutineGroups(@Request() req) {
    return this.routineGroupService.findAll(req.user.userId);
  }

  @Patch('routine-groups/sort-order')
  @ApiOperation({ summary: '루틴 그룹 순서 일괄 변경' })
  @ApiSuccess(RoutineGroupDto, '순서 변경 성공', { isArray: true })
  reorderRoutineGroups(@Request() req, @Body() dto: ReorderRoutineGroupDto) {
    return this.routineGroupService.reorder(req.user.userId, dto);
  }

  @Get('routine-groups/:id')
  @ApiOperation({
    summary: '루틴 그룹 상세 조회 (소속 습관 목록 + 오늘 진행률)',
  })
  @ApiSuccess(RoutineGroupDetailDto, '루틴 그룹 상세 조회 성공')
  @ApiNotFound('루틴 그룹을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴 그룹만 조회할 수 있습니다')
  findRoutineGroupOne(@Request() req, @Param('id') id: string) {
    return this.routineGroupService.findOne(req.user.userId, id);
  }

  @Patch('routine-groups/:id')
  @ApiOperation({ summary: '루틴 그룹 수정' })
  @ApiSuccess(RoutineGroupDto, '루틴 그룹 수정 성공')
  @ApiNotFound('루틴 그룹을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴 그룹만 수정할 수 있습니다')
  updateRoutineGroup(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineGroupDto,
  ) {
    return this.routineGroupService.update(req.user.userId, id, dto);
  }

  @Delete('routine-groups/:id')
  @ApiOperation({
    summary:
      '루틴 그룹 삭제 (soft delete, 소속 습관은 그룹 소속만 해제되고 유지)',
  })
  @ApiSuccess(MessageResponseDto, '루틴 그룹 삭제 성공')
  @ApiNotFound('루틴 그룹을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴 그룹만 삭제할 수 있습니다')
  removeRoutineGroup(@Request() req, @Param('id') id: string) {
    return this.routineGroupService.remove(req.user.userId, id);
  }

  @Get('me/badges')
  @ApiOperation({ summary: '내가 전체 루틴에서 획득한 통산 배지 목록 조회' })
  @ApiSuccess(UserRoutineBadgeDto, '내 배지 목록 조회 성공', { isArray: true })
  getMyBadges(@Request() req) {
    return this.routineBadgeService.findMine(req.user.userId);
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

  @Get('groups/:groupId/leaderboard')
  @ApiOperation({
    summary: '그룹 랭킹보드 (공유된 루틴 기준 체크 횟수/달성률 순위)',
  })
  @ApiSuccess(LeaderboardResponseDto, '랭킹보드 조회 성공')
  @ApiForbidden('그룹 멤버가 아닙니다')
  getLeaderboard(
    @Request() req,
    @Param('groupId') groupId: string,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.routineLeaderboardService.getLeaderboard(
      req.user.userId,
      groupId,
      query,
    );
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
  @ApiOperation({ summary: '루틴 종료 (soft delete, 체크 기록은 보존)' })
  @ApiSuccess(MessageResponseDto, '루틴 종료 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 종료할 수 있습니다')
  end(@Request() req, @Param('id') id: string) {
    return this.routineService.end(req.user.userId, id);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: '루틴 일시정지 (체크 불가, 스트릭은 끊기지 않음)' })
  @ApiSuccess(RoutineDto, '일시정지 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 일시정지할 수 있습니다')
  @ApiConflict('이미 일시정지된 루틴입니다')
  pause(@Request() req, @Param('id') id: string) {
    return this.routineService.pause(req.user.userId, id);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: '루틴 재개' })
  @ApiSuccess(RoutineDto, '재개 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 재개할 수 있습니다')
  @ApiConflict('일시정지 상태가 아닙니다')
  resume(@Request() req, @Param('id') id: string) {
    return this.routineService.resume(req.user.userId, id);
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

  @Post(':id/categories')
  @ApiOperation({ summary: '루틴에 카테고리 연결' })
  @ApiCreated(RoutineCategoryLinkDto, '연결 성공')
  @ApiNotFound('루틴 또는 카테고리를 찾을 수 없습니다')
  @ApiForbidden('본인의 루틴만 카테고리를 연결할 수 있습니다')
  @ApiConflict('이미 연결된 카테고리입니다')
  addCategoryLink(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateRoutineCategoryLinkDto,
  ) {
    return this.routineService.addCategory(req.user.userId, id, dto);
  }

  @Delete(':id/categories/:categoryId')
  @ApiOperation({ summary: '루틴에서 카테고리 연결 해제' })
  @ApiSuccess(MessageResponseDto, '연결 해제 성공')
  @ApiNotFound('연결 정보를 찾을 수 없습니다')
  removeCategoryLink(
    @Request() req,
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.routineService.removeCategory(req.user.userId, id, categoryId);
  }

  @Get(':id/categories')
  @ApiOperation({ summary: '루틴에 연결된 카테고리 목록 조회' })
  @ApiSuccess(RoutineCategoryLinkDto, '연결된 카테고리 목록 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('본인의 루틴만 조회할 수 있습니다')
  findCategoryLinks(@Request() req, @Param('id') id: string) {
    return this.routineService.findCategories(req.user.userId, id);
  }

  @Get(':id/badges')
  @ApiOperation({
    summary: '특정 루틴에서 획득한 배지 목록 조회 (본인 또는 공유 그룹원)',
  })
  @ApiSuccess(UserRoutineBadgeDto, '루틴별 배지 조회 성공', { isArray: true })
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('루틴에 접근할 권한이 없습니다')
  getRoutineBadges(@Request() req, @Param('id') id: string) {
    return this.routineBadgeService.findByRoutine(req.user.userId, id);
  }

  @Get(':id/stats/heatmap')
  @ApiOperation({ summary: '루틴 달력 히트맵 (날짜별 달성 여부)' })
  @ApiSuccess(HeatmapResponseDto, '히트맵 조회 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('루틴에 접근할 권한이 없습니다')
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
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('루틴에 접근할 권한이 없습니다')
  getStreak(@Request() req, @Param('id') id: string) {
    return this.routineStatsService.getStreak(req.user.userId, id);
  }

  @Get(':id/stats/rate')
  @ApiOperation({ summary: '루틴 기간별 달성률 조회' })
  @ApiSuccess(RateResponseDto, '달성률 조회 성공')
  @ApiNotFound('루틴을 찾을 수 없습니다')
  @ApiForbidden('루틴에 접근할 권한이 없습니다')
  getRate(
    @Request() req,
    @Param('id') id: string,
    @Query() query: RateQueryDto,
  ) {
    return this.routineStatsService.getRate(req.user.userId, id, query);
  }
}
