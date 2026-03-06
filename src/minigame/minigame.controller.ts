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

import { MinigameService } from './minigame.service';
import { CreateMinigameResultDto } from './dto/create-minigame-result.dto';
import { MinigameQueryDto } from './dto/minigame-query.dto';
import {
  MinigameResultDto,
  PaginatedMinigameResultDto,
  MessageResponseDto,
} from './dto/minigame-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

/**
 * 미니게임 컨트롤러
 * 사다리타기/룰렛 게임 이력 저장 및 조회 API
 */
@ApiTags('미니게임')
@Controller('minigames')
@ApiCommonAuthResponses()
export class MinigameController {
  constructor(private readonly minigameService: MinigameService) {}

  @Post('results')
  @ApiOperation({ summary: '게임 결과 저장' })
  @ApiCreated(MinigameResultDto, '게임 결과 저장 성공')
  @ApiForbidden('그룹 멤버만 저장할 수 있습니다')
  create(@Request() req, @Body() dto: CreateMinigameResultDto) {
    return this.minigameService.create(req.user.userId, dto);
  }

  @Get('results')
  @ApiOperation({ summary: '그룹 게임 이력 조회' })
  @ApiSuccess(PaginatedMinigameResultDto, '게임 이력 조회 성공')
  @ApiForbidden('그룹 멤버만 조회할 수 있습니다')
  findAll(@Request() req, @Query() query: MinigameQueryDto) {
    return this.minigameService.findAll(req.user.userId, query);
  }

  @Delete('results/:id')
  @ApiOperation({ summary: '게임 이력 삭제' })
  @ApiSuccess(MessageResponseDto, '게임 이력 삭제 성공')
  @ApiNotFound('게임 이력을 찾을 수 없습니다')
  @ApiForbidden('본인 또는 그룹 관리자만 삭제할 수 있습니다')
  remove(@Request() req, @Param('id') id: string) {
    return this.minigameService.remove(req.user.userId, id);
  }
}
