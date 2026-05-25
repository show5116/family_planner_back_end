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
import { UpsertGroupExpiryPresetDto } from './dto/upsert-group-expiry-preset.dto';
import { GroupIdQueryDto } from './dto/group-id-query.dto';
import { ExpiryPresetDto } from './dto/expiry-preset-response.dto';

@ApiTags('냉장고 관리')
@Controller('fridge')
@ApiCommonAuthResponses()
export class ExpiryPresetController {
  constructor(private readonly expiryPresetService: ExpiryPresetService) {}

  @Get('expiry-presets')
  @ApiOperation({
    summary:
      '유통기한 프리셋 전체 조회 (글로벌 기본값 + 그룹 커스텀 머지, keywords로 클라이언트 로컬 매칭)',
  })
  @ApiSuccess(ExpiryPresetDto, '조회 성공', { isArray: true })
  getPresets(@Request() req, @Query() query: GroupIdQueryDto) {
    return this.expiryPresetService.getPresets(req.user.userId, query.groupId);
  }

  @Put('expiry-presets')
  @ApiOperation({ summary: '그룹별 유통기한 커스텀 프리셋 등록/수정' })
  @ApiSuccess(ExpiryPresetDto, '저장 성공')
  upsertGroupPreset(@Request() req, @Body() dto: UpsertGroupExpiryPresetDto) {
    return this.expiryPresetService.upsertGroupPreset(req.user.userId, dto);
  }

  @Delete('expiry-presets/:presetId')
  @ApiOperation({
    summary: '그룹별 유통기한 커스텀 프리셋 삭제 (글로벌 기본값으로 복원)',
  })
  @ApiSuccess(ExpiryPresetDto, '삭제 성공')
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
