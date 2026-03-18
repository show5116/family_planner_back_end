import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VoteService } from './vote.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CastBallotDto } from './dto/cast-ballot.dto';
import { VoteQueryDto } from './dto/vote-query.dto';
import { VoteDto, PaginatedVoteDto } from './dto/vote-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiBadRequest,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

/**
 * 투표 컨트롤러
 * 그룹 내 투표 생성, 참여, 조회 API
 */
@ApiTags('투표')
@Controller('votes')
@ApiCommonAuthResponses()
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Get(':groupId')
  @ApiOperation({ summary: '투표 목록 조회' })
  @ApiSuccess(PaginatedVoteDto, '투표 목록 조회 성공')
  findAll(
    @Request() req,
    @Param('groupId') groupId: string,
    @Query() query: VoteQueryDto,
  ) {
    return this.voteService.findAll(req.user.userId, groupId, query);
  }

  @Get(':groupId/:voteId')
  @ApiOperation({ summary: '투표 상세 조회' })
  @ApiSuccess(VoteDto, '투표 상세 조회 성공')
  @ApiNotFound('투표를 찾을 수 없습니다')
  findOne(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.voteService.findOne(req.user.userId, groupId, voteId);
  }

  @Post(':groupId')
  @ApiOperation({ summary: '투표 생성' })
  @ApiCreated(VoteDto, '투표 생성 성공')
  create(
    @Request() req,
    @Param('groupId') groupId: string,
    @Body() dto: CreateVoteDto,
  ) {
    return this.voteService.create(req.user.userId, groupId, dto);
  }

  @Delete(':groupId/:voteId')
  @ApiOperation({ summary: '투표 삭제 (작성자 또는 그룹 관리자)' })
  @ApiSuccess(MessageResponseDto, '투표 삭제 성공')
  @ApiNotFound('투표를 찾을 수 없습니다')
  @ApiForbidden('투표 작성자 또는 그룹 관리자만 삭제할 수 있습니다')
  remove(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.voteService.remove(req.user.userId, groupId, voteId);
  }

  @Post(':groupId/:voteId/ballots')
  @ApiOperation({ summary: '투표 참여 (선택지 선택/변경)' })
  @ApiSuccess(VoteDto, '투표 참여 성공')
  @ApiNotFound('투표를 찾을 수 없습니다')
  @ApiBadRequest('마감된 투표이거나 유효하지 않은 선택지')
  castBallot(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('voteId') voteId: string,
    @Body() dto: CastBallotDto,
  ) {
    return this.voteService.castBallot(req.user.userId, groupId, voteId, dto);
  }

  @Delete(':groupId/:voteId/ballots')
  @ApiOperation({ summary: '투표 취소' })
  @ApiSuccess(VoteDto, '투표 취소 성공')
  @ApiNotFound('투표를 찾을 수 없습니다')
  @ApiBadRequest('마감된 투표는 취소할 수 없습니다')
  cancelBallot(
    @Request() req,
    @Param('groupId') groupId: string,
    @Param('voteId') voteId: string,
  ) {
    return this.voteService.cancelBallot(req.user.userId, groupId, voteId);
  }
}
