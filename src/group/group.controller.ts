import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupService } from '@/group/group.service';
import { CreateGroupDto } from '@/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/group/dto/update-group.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import {
  GroupPermissionGuard,
  RequirePermission,
  GroupMembershipGuard,
} from '@/group/guards';
import { PermissionCode } from '@prisma/client';

@ApiTags('그룹')
@Controller('groups')
@ApiCommonAuthResponses()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: '그룹 생성' })
  @ApiCreated(Object, '그룹 생성 성공')
  create(@Request() req, @Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(req.user.userId, createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: '내가 속한 그룹 목록 조회' })
  @ApiSuccess(Object, '그룹 목록 반환')
  findMyGroups(@Request() req) {
    return this.groupService.findMyGroups(req.user.userId);
  }

  @Get(':id')
  @UseGuards(GroupMembershipGuard)
  @ApiOperation({ summary: '그룹 상세 조회' })
  @ApiSuccess(Object, '그룹 상세 정보 반환')
  @ApiForbidden('접근 권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  findOne(@Param('id') id: string, @Request() req) {
    return this.groupService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.UPDATE_GROUP)
  @ApiOperation({ summary: '그룹 정보 수정 (UPDATE_GROUP 권한 필요)' })
  @ApiSuccess(Object, '그룹 수정 성공')
  @ApiForbidden('권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(id, req.user.userId, updateGroupDto);
  }

  @Delete(':id')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.DELETE_GROUP)
  @ApiOperation({ summary: '그룹 삭제 (DELETE_GROUP 권한 필요)' })
  @ApiSuccess(Object, '그룹 삭제 성공')
  @ApiForbidden('권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  remove(@Param('id') id: string, @Request() req) {
    return this.groupService.remove(id, req.user.userId);
  }
}
