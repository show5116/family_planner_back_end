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
import { MemoQueryDto, MemoTagListQueryDto } from './dto/memo-query.dto';
import { CreateMemoTagDto } from './dto/create-memo-tag.dto';
import { CreateMemoAttachmentDto } from './dto/create-memo-attachment.dto';
import {
  MemoDto,
  MemoTagNamesDto,
  PaginatedMemoDto,
  MemoTagDto,
  MemoAttachmentDto,
} from './dto/memo-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
  ApiConflict,
} from '@/common/decorators/api-responses.decorator';

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

  @Get('tags')
  @ApiOperation({ summary: '태그 이름 목록 조회 (중복 제거)' })
  @ApiSuccess(MemoTagNamesDto, '태그 이름 목록 조회 성공')
  findTagNames(@Request() req, @Query() query: MemoTagListQueryDto) {
    return this.memoService.findTagNames(req.user.userId, query);
  }

  @Get('pinned')
  @ApiOperation({ summary: '핀된 메모 목록 조회 (대시보드 위젯용)' })
  @ApiSuccess(MemoDto, '핀된 메모 목록 조회 성공', { isArray: true })
  findPinned(@Request() req, @Query() query: MemoTagListQueryDto) {
    return this.memoService.findPinned(req.user.userId, query.groupId);
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

  @Post(':id/lock')
  @ApiOperation({ summary: '편집 잠금 획득 (편집 모드 진입 시 호출)' })
  @ApiSuccess(MessageResponseDto, '잠금 획득 성공')
  @ApiNotFound('메모를 찾을 수 없습니다')
  @ApiConflict('다른 사용자가 편집 중입니다')
  acquireLock(@Request() req, @Param('id') id: string) {
    return this.memoService.acquireLock(req.user.userId, id);
  }

  @Delete(':id/lock')
  @ApiOperation({ summary: '편집 잠금 해제 (편집 완료 또는 취소 시 호출)' })
  @ApiSuccess(MessageResponseDto, '잠금 해제 성공')
  releaseLock(@Request() req, @Param('id') id: string) {
    return this.memoService.releaseLock(req.user.userId, id);
  }

  @Post(':id/lock/heartbeat')
  @ApiOperation({ summary: '편집 잠금 TTL 갱신 (30초마다 호출)' })
  @ApiSuccess(MessageResponseDto, '갱신 성공')
  @ApiConflict('잠금이 만료되었거나 다른 사용자에게 이전되었습니다')
  heartbeat(@Request() req, @Param('id') id: string) {
    return this.memoService.heartbeat(req.user.userId, id);
  }
}
