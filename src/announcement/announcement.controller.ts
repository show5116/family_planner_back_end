import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { PinAnnouncementDto } from './dto/pin-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import {
  AnnouncementDto,
  PaginatedAnnouncementDto,
} from './dto/announcement-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';
import { AdminGuard } from '@/auth/admin.guard';

/**
 * 공지사항 컨트롤러
 * 운영자(ADMIN)가 전체 회원에게 공지사항을 전달하는 시스템
 */
@ApiTags('공지사항')
@Controller('announcements')
@ApiCommonAuthResponses()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: '공지사항 목록 조회' })
  @ApiSuccess(PaginatedAnnouncementDto, '공지사항 목록 조회 성공')
  findAll(@Request() req, @Query() query: AnnouncementQueryDto) {
    return this.announcementService.findAll(req.user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '공지사항 상세 조회' })
  @ApiSuccess(AnnouncementDto, '공지사항 상세 조회 성공')
  @ApiNotFound('공지사항을 찾을 수 없습니다')
  findOne(@Param('id') id: string, @Request() req) {
    return this.announcementService.findOne(id, req.user.userId);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 작성 (ADMIN 전용)' })
  @ApiCreated(AnnouncementDto, '공지사항 작성 성공')
  create(@Request() req, @Body() dto: CreateAnnouncementDto) {
    return this.announcementService.create(req.user.userId, dto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 수정 (ADMIN 전용)' })
  @ApiSuccess(AnnouncementDto, '공지사항 수정 성공')
  @ApiNotFound('공지사항을 찾을 수 없습니다')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 삭제 (ADMIN 전용)' })
  @ApiSuccess(MessageResponseDto, '공지사항 삭제 성공')
  @ApiNotFound('공지사항을 찾을 수 없습니다')
  remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }

  @Patch(':id/pin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지사항 고정/해제 (ADMIN 전용)' })
  @ApiSuccess(AnnouncementDto, '공지사항 고정/해제 성공')
  @ApiNotFound('공지사항을 찾을 수 없습니다')
  togglePin(@Param('id') id: string, @Body() dto: PinAnnouncementDto) {
    return this.announcementService.togglePin(id, dto.isPinned);
  }
}
