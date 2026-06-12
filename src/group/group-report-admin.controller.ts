import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupReportService } from '@/group/group-report.service';
import { ResolveReportDto } from '@/group/dto/resolve-report.dto';
import {
  AdminMemberReportDto,
  MemberReportResponseDto,
} from '@/group/dto/group-response.dto';
import { AdminGuard } from '@/auth/admin.guard';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiNotFound,
  ApiConflict,
} from '@/common/decorators/api-responses.decorator';
import { ReportStatus } from '@prisma/client';

@ApiTags('그룹 신고 (ADMIN)')
@Controller('groups/admin/reports')
@UseGuards(AdminGuard)
@ApiCommonAuthResponses()
export class GroupReportAdminController {
  constructor(private readonly groupReportService: GroupReportService) {}

  @Get()
  @ApiOperation({
    summary: '신고 목록 조회',
    description:
      'status 쿼리로 필터 가능 (PENDING, REVIEWING, RESOLVED, DISMISSED)',
  })
  @ApiSuccess(AdminMemberReportDto, '신고 목록 조회 성공', { isArray: true })
  getReports(@Query('status') status?: ReportStatus) {
    return this.groupReportService.adminGetReports(status);
  }

  @Patch(':reportId')
  @ApiOperation({ summary: '신고 처리 (상태 변경)' })
  @ApiSuccess(MemberReportResponseDto, '신고 처리 성공')
  @ApiNotFound('신고를 찾을 수 없음')
  @ApiConflict('이미 처리 완료된 신고')
  resolveReport(
    @Param('reportId') reportId: string,
    @Request() req,
    @Body() dto: ResolveReportDto,
  ) {
    return this.groupReportService.adminResolveReport(
      req.user.userId,
      reportId,
      dto,
    );
  }
}
