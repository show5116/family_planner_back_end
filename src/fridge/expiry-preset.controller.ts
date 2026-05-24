import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiNotFound,
  ApiSuccess,
} from '@/common/decorators/api-responses.decorator';
import { ExpiryPresetService } from './expiry-preset.service';
import { ExpirySuggestionQueryDto } from './dto/expiry-suggestion-query.dto';
import { UpsertGroupExpiryPresetDto } from './dto/upsert-group-expiry-preset.dto';
import { GroupIdQueryDto } from './dto/group-id-query.dto';
import {
  ExpirySuggestionDto,
  GroupExpiryPresetDto,
} from './dto/expiry-preset-response.dto';

@ApiTags('냉장고 관리')
@Controller('fridge')
@ApiCommonAuthResponses()
export class ExpiryPresetController {
  constructor(private readonly expiryPresetService: ExpiryPresetService) {}

  @Get('expiry-suggestion')
  @ApiOperation({
    summary:
      '품목명으로 유통기한 추천 (storageType 미지정 시 모든 보관함 추천 목록 반환)',
  })
  @ApiSuccess(ExpirySuggestionDto, '추천 성공', { isArray: true })
  getExpirySuggestion(
    @Request() req,
    @Query() query: ExpirySuggestionQueryDto,
  ) {
    return this.expiryPresetService.getSuggestions(
      req.user.userId,
      query.groupId,
      query.name,
      query.storageType,
    );
  }

  @Get('expiry-presets')
  @ApiOperation({ summary: '그룹별 유통기한 커스텀 프리셋 목록 조회' })
  @ApiSuccess(GroupExpiryPresetDto, '조회 성공', { isArray: true })
  getGroupPresets(@Request() req, @Query() query: GroupIdQueryDto) {
    return this.expiryPresetService.getGroupPresets(
      req.user.userId,
      query.groupId,
    );
  }

  @Put('expiry-presets')
  @ApiOperation({ summary: '그룹별 유통기한 커스텀 프리셋 등록/수정' })
  @ApiSuccess(GroupExpiryPresetDto, '저장 성공')
  upsertGroupPreset(@Request() req, @Body() dto: UpsertGroupExpiryPresetDto) {
    return this.expiryPresetService.upsertGroupPreset(req.user.userId, dto);
  }

  @Delete('expiry-presets/:presetId')
  @ApiOperation({ summary: '그룹별 유통기한 커스텀 프리셋 삭제' })
  @ApiSuccess(GroupExpiryPresetDto, '삭제 성공')
  @ApiNotFound('프리셋을 찾을 수 없습니다')
  deleteGroupPreset(
    @Request() req,
    @Query() query: GroupIdQueryDto,
    @Param('presetId') presetId: string,
  ) {
    return this.expiryPresetService.deleteGroupPreset(
      req.user.userId,
      query.groupId,
      presetId,
    );
  }
}
