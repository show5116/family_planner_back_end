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

import { MemoService } from './memo.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { MemoQueryDto } from './dto/memo-query.dto';
import { CreateMemoTagDto } from './dto/create-memo-tag.dto';
import { CreateMemoAttachmentDto } from './dto/create-memo-attachment.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import {
  MemoDto,
  PaginatedMemoDto,
  MemoTagDto,
  MemoAttachmentDto,
  ChecklistItemDto,
} from './dto/memo-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

/**
 * 메모 컨트롤러
 * 개인 및 그룹 메모 관리 API
 */
@ApiTags('메모')
@Controller('memos')
@ApiCommonAuthResponses()
export class MemoController {
  constructor(private readonly memoService: MemoService) {}

  @Post()
  @ApiOperation({ summary: '메모 생성' })
  @ApiCreated(MemoDto, '메모 생성 성공')
  create(@Request() req, @Body() dto: CreateMemoDto) {
    return this.memoService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '메모 목록 조회' })
  @ApiSuccess(PaginatedMemoDto, '메모 목록 조회 성공')
  findAll(@Request() req, @Query() query: MemoQueryDto) {
    return this.memoService.findAll(req.user.userId, query);
  }

  @Get('pinned')
  @ApiOperation({ summary: '핀된 메모 목록 조회 (대시보드 위젯용)' })
  @ApiSuccess(MemoDto, '핀된 메모 목록 조회 성공', { isArray: true })
  findPinned(@Request() req) {
    return this.memoService.findPinned(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '메모 상세 조회' })
  @ApiSuccess(MemoDto, '메모 상세 조회 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('메모에 접근할 권한이 없습니다')
  findOne(@Request() req, @Param('id') id: string) {
    return this.memoService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '메모 수정' })
  @ApiSuccess(MemoDto, '메모 수정 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateMemoDto) {
    return this.memoService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '메모 삭제' })
  @ApiSuccess(MessageResponseDto, '메모 삭제 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 삭제할 수 있습니다')
  remove(@Request() req, @Param('id') id: string) {
    return this.memoService.remove(req.user.userId, id);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: '메모 핀 토글 (핀 ↔ 핀 해제)' })
  @ApiSuccess(MemoDto, '핀 토글 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 핀 설정할 수 있습니다')
  togglePin(@Request() req, @Param('id') id: string) {
    return this.memoService.togglePin(req.user.userId, id);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: '메모 태그 추가' })
  @ApiCreated(MemoTagDto, '태그 추가 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  addTag(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateMemoTagDto,
  ) {
    return this.memoService.addTag(req.user.userId, id, dto);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: '메모 태그 삭제' })
  @ApiSuccess(MessageResponseDto, '태그 삭제 성공')
  @ApiNotFound('태그를 찾을 수 없습니다')
  removeTag(
    @Request() req,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.memoService.removeTag(req.user.userId, id, tagId);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: '메모 첨부파일 추가' })
  @ApiCreated(MemoAttachmentDto, '첨부파일 추가 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  addAttachment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateMemoAttachmentDto,
  ) {
    return this.memoService.addAttachment(req.user.userId, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: '메모 첨부파일 삭제' })
  @ApiSuccess(MessageResponseDto, '첨부파일 삭제 성공')
  @ApiNotFound('첨부파일을 찾을 수 없습니다')
  removeAttachment(
    @Request() req,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.memoService.removeAttachment(req.user.userId, id, attachmentId);
  }

  @Post(':id/checklist')
  @ApiOperation({ summary: '체크리스트 항목 추가' })
  @ApiCreated(ChecklistItemDto, '항목 추가 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  addChecklistItem(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.memoService.addChecklistItem(req.user.userId, id, dto);
  }

  @Patch(':id/checklist/:itemId')
  @ApiOperation({ summary: '체크리스트 항목 수정 (내용/순서)' })
  @ApiSuccess(ChecklistItemDto, '항목 수정 성공')
  @ApiNotFound('항목을 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  updateChecklistItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.memoService.updateChecklistItem(
      req.user.userId,
      id,
      itemId,
      dto,
    );
  }

  @Delete(':id/checklist/:itemId')
  @ApiOperation({ summary: '체크리스트 항목 삭제' })
  @ApiSuccess(MessageResponseDto, '항목 삭제 성공')
  @ApiNotFound('항목을 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  removeChecklistItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.memoService.removeChecklistItem(req.user.userId, id, itemId);
  }

  @Post(':id/checklist/:itemId/toggle')
  @ApiOperation({ summary: '체크리스트 항목 체크/해제 토글' })
  @ApiSuccess(ChecklistItemDto, '토글 성공')
  @ApiNotFound('항목을 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  toggleChecklistItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.memoService.toggleChecklistItem(req.user.userId, id, itemId);
  }

  @Post(':id/checklist/reset')
  @ApiOperation({ summary: '체크리스트 전체 체크 해제' })
  @ApiSuccess(MessageResponseDto, '전체 체크 해제 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiForbidden('본인의 메모만 수정할 수 있습니다')
  resetChecklist(@Request() req, @Param('id') id: string) {
    return this.memoService.resetChecklist(req.user.userId, id);
  }
}
