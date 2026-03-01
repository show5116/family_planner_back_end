import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
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
} from './dto/indicator-response.dto';
import { IndicatorHistoryQueryDto } from './dto/indicator-history-query.dto';

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
}
