import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/auth/admin.guard';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';
import { InvestmentService } from './investment.service';
import {
  IndicatorDto,
  IndicatorHistoryDto,
  HistoricalInitResultDto,
} from './dto/indicator-response.dto';
import { IndicatorHistoryQueryDto } from './dto/indicator-history-query.dto';
import { HistoricalInitQueryDto } from './dto/historical-init-query.dto';
import { ReorderBookmarksDto } from './dto/reorder-bookmarks.dto';

@ApiTags('투자지표')
@Controller('indicators')
@UseGuards(JwtAuthGuard)
@ApiCommonAuthResponses()
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get()
  @ApiOperation({ summary: '전체 지표 목록 + 최신 시세' })
  @ApiSuccess(IndicatorDto, '지표 목록 조회 성공', { isArray: true })
  findAll(@Request() req) {
    return this.investmentService.findAll(req.user.userId);
  }

  @Get('bookmarks')
  @ApiOperation({ summary: '즐겨찾기 목록 + 최신 시세' })
  @ApiSuccess(IndicatorDto, '즐겨찾기 목록 조회 성공', { isArray: true })
  findBookmarks(@Request() req) {
    return this.investmentService.findBookmarks(req.user.userId);
  }

  @Patch('bookmarks/reorder')
  @ApiOperation({
    summary: '즐겨찾기 순서 변경',
    description:
      '즐겨찾기된 symbol 배열을 원하는 순서대로 전달하면 해당 순서로 저장됩니다.',
  })
  @ApiSuccess(Object, '즐겨찾기 순서 변경 성공')
  reorderBookmarks(@Request() req, @Body() dto: ReorderBookmarksDto) {
    return this.investmentService.reorderBookmarks(
      req.user.userId,
      dto.symbols,
    );
  }

  @Get(':symbol')
  @ApiOperation({ summary: '지표 상세 + 최신 시세' })
  @ApiSuccess(IndicatorDto, '지표 상세 조회 성공')
  @ApiNotFound('지표를 찾을 수 없음')
  findOne(@Request() req, @Param('symbol') symbol: string) {
    return this.investmentService.findOne(req.user.userId, symbol);
  }

  @Get(':symbol/history')
  @ApiOperation({ summary: '지표 시세 히스토리 (시계열)' })
  @ApiSuccess(IndicatorHistoryDto, '히스토리 조회 성공')
  @ApiNotFound('지표를 찾을 수 없음')
  findHistory(
    @Request() req,
    @Param('symbol') symbol: string,
    @Query() query: IndicatorHistoryQueryDto,
  ) {
    return this.investmentService.findHistory(
      req.user.userId,
      symbol,
      query.days ?? 30,
    );
  }

  @Post(':symbol/bookmark')
  @HttpCode(201)
  @ApiOperation({ summary: '즐겨찾기 등록' })
  @ApiCreated(IndicatorDto, '즐겨찾기 등록 성공')
  @ApiNotFound('지표를 찾을 수 없음')
  addBookmark(@Request() req, @Param('symbol') symbol: string) {
    return this.investmentService.addBookmark(req.user.userId, symbol);
  }

  @Delete(':symbol/bookmark')
  @ApiOperation({ summary: '즐겨찾기 해제' })
  @ApiSuccess(IndicatorDto, '즐겨찾기 해제 성공')
  @ApiNotFound('지표를 찾을 수 없음')
  removeBookmark(@Request() req, @Param('symbol') symbol: string) {
    return this.investmentService.removeBookmark(req.user.userId, symbol);
  }

  @Post('admin/init-history')
  @HttpCode(202)
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '[어드민] 과거 데이터 일괄 초기화',
    description:
      '배포 후 1회 실행. Yahoo/CoinGecko/BOK에서 지정 기간 과거 시세를 백그라운드로 수집합니다. 결과는 서버 로그에서 확인하세요.',
  })
  @ApiSuccess(Object, '히스토리 초기화 시작됨 (백그라운드 실행)')
  initHistory(@Query() query: HistoricalInitQueryDto) {
    const days = query.days ?? 365;
    // 오래 걸리는 작업이므로 응답을 먼저 반환하고 백그라운드에서 실행
    this.investmentService.initializeHistoricalData(days).catch(() => {});
    return { message: `히스토리 초기화 시작됨 (${days}일, 백그라운드 실행)` };
  }
}
