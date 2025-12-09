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
import { JoinGroupDto } from '@/group/dto/join-group.dto';
import { UpdateMemberRoleDto } from '@/group/dto/update-member-role.dto';
import { UpdateMyColorDto } from '@/group/dto/update-my-color.dto';
import { TransferOwnershipDto } from '@/group/dto/transfer-ownership.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiConflict,
  ApiBadRequest,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import { RoleService } from '@/role/role.service';
import { CreateRoleDto } from '@/role/dto/create-role.dto';
import { UpdateRoleDto } from '@/role/dto/update-role.dto';
import {
  GroupPermissionGuard,
  RequirePermission,
} from '@/group/group-permission.guard';
import { PermissionCode } from '@prisma/client';

@ApiTags('그룹')
@Controller('groups')
@ApiCommonAuthResponses()
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly roleService: RoleService,
  ) {}

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
  @ApiOperation({ summary: '그룹 상세 조회' })
  @ApiSuccess(Object, '그룹 상세 정보 반환')
  @ApiForbidden('접근 권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  findOne(@Param('id') id: string, @Request() req) {
    return this.groupService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '그룹 정보 수정 (UPDATE 권한 필요)' })
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
  @ApiOperation({ summary: '그룹 삭제 (DELETE 권한 필요)' })
  @ApiSuccess(Object, '그룹 삭제 성공')
  @ApiForbidden('권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  remove(@Param('id') id: string, @Request() req) {
    return this.groupService.remove(id, req.user.userId);
  }

  @Post('join')
  @ApiOperation({ summary: '초대 코드로 그룹 가입' })
  @ApiCreated(Object, '그룹 가입 성공')
  @ApiNotFound('유효하지 않은 초대 코드')
  @ApiConflict('이미 그룹 멤버임')
  joinByInviteCode(@Request() req, @Body() joinGroupDto: JoinGroupDto) {
    return this.groupService.joinByInviteCode(
      req.user.userId,
      joinGroupDto.inviteCode,
    );
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '그룹 나가기' })
  @ApiSuccess(Object, '그룹 나가기 성공')
  @ApiBadRequest('OWNER는 나갈 수 없음')
  @ApiNotFound('그룹 멤버를 찾을 수 없음')
  leave(@Param('id') id: string, @Request() req) {
    return this.groupService.leave(id, req.user.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '그룹 멤버 목록 조회' })
  @ApiSuccess(Object, '멤버 목록 반환')
  @ApiForbidden('접근 권한 없음')
  getMembers(@Param('id') id: string, @Request() req) {
    return this.groupService.getMembers(id, req.user.userId);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: '멤버 역할 변경 (ASSIGN_ROLE 권한 필요)' })
  @ApiSuccess(Object, '역할 변경 성공')
  @ApiBadRequest('자신의 역할은 변경 불가')
  @ApiForbidden('권한 없음')
  @ApiNotFound('멤버를 찾을 수 없음')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.groupService.updateMemberRole(
      id,
      targetUserId,
      req.user.userId,
      updateMemberRoleDto.roleId,
    );
  }

  @Patch(':id/my-color')
  @ApiOperation({ summary: '개인 그룹 색상 설정' })
  @ApiSuccess(Object, '색상 설정 성공')
  @ApiForbidden('접근 권한 없음')
  updateMyColor(
    @Param('id') id: string,
    @Request() req,
    @Body() updateMyColorDto: UpdateMyColorDto,
  ) {
    return this.groupService.updateMyColor(
      id,
      req.user.userId,
      updateMyColorDto.customColor,
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '멤버 삭제 (REMOVE_MEMBER 권한 필요)' })
  @ApiSuccess(Object, '멤버 삭제 성공')
  @ApiBadRequest('자신은 삭제 불가 또는 OWNER 삭제 불가')
  @ApiForbidden('권한 없음')
  @ApiNotFound('멤버를 찾을 수 없음')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req,
  ) {
    return this.groupService.removeMember(id, targetUserId, req.user.userId);
  }

  @Post(':id/regenerate-code')
  @ApiOperation({
    summary: '초대 코드 재생성 (REGENERATE_INVITE_CODE 권한 필요)',
  })
  @ApiSuccess(Object, '초대 코드 재생성 성공')
  @ApiForbidden('권한 없음')
  regenerateInviteCode(@Param('id') id: string, @Request() req) {
    return this.groupService.regenerateInviteCode(id, req.user.userId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({
    summary: 'OWNER 권한 양도 (현재 OWNER만 가능)',
    description:
      '그룹의 OWNER 권한을 다른 멤버에게 양도합니다. 양도 후 현재 OWNER는 MEMBER 역할로 변경됩니다.',
  })
  @ApiSuccess(Object, 'OWNER 권한 양도 성공')
  @ApiBadRequest('자기 자신에게는 양도 불가')
  @ApiForbidden('현재 OWNER가 아니거나 그룹 멤버가 아님')
  @ApiNotFound('새로운 OWNER가 될 사용자를 그룹에서 찾을 수 없음')
  transferOwnership(
    @Param('id') id: string,
    @Request() req,
    @Body() transferOwnershipDto: TransferOwnershipDto,
  ) {
    return this.groupService.transferOwnership(
      id,
      req.user.userId,
      transferOwnershipDto.newOwnerId,
    );
  }

  // ==================== 그룹별 역할 관리 (MANAGE_ROLE 권한 필요) ====================

  @Get(':groupId/roles')
  @ApiOperation({
    summary: '그룹별 역할 전체 조회 (그룹 멤버 전용)',
    description: '공통 역할 + 해당 그룹의 커스텀 역할 조회',
  })
  @ApiSuccess(Object, '역할 목록 반환')
  @ApiForbidden('그룹 멤버가 아님')
  findAllRolesByGroup(@Param('groupId') groupId: string, @Request() req) {
    return this.roleService.findAllByGroup(req.user.userId, groupId);
  }

  @Post(':groupId/roles')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_ROLE)
  @ApiOperation({
    summary: '그룹별 커스텀 역할 생성 (MANAGE_ROLE 권한 필요)',
  })
  @ApiCreated(Object, '역할 생성 성공')
  @ApiForbidden('MANAGE_ROLE 권한 없음')
  @ApiConflict('역할명 중복')
  createRoleForGroup(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.roleService.createForGroup(
      req.user.userId,
      groupId,
      createRoleDto,
    );
  }

  @Patch(':groupId/roles/:id')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_ROLE)
  @ApiOperation({
    summary: '그룹별 커스텀 역할 수정 (MANAGE_ROLE 권한 필요)',
  })
  @ApiSuccess(Object, '역할 수정 성공')
  @ApiForbidden('MANAGE_ROLE 권한 없음')
  @ApiNotFound('역할을 찾을 수 없음')
  @ApiConflict('역할명 중복')
  updateRoleForGroup(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Request() req,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.updateForGroup(
      req.user.userId,
      groupId,
      id,
      updateRoleDto,
    );
  }

  @Delete(':groupId/roles/:id')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_ROLE)
  @ApiOperation({
    summary: '그룹별 커스텀 역할 삭제 (MANAGE_ROLE 권한 필요)',
  })
  @ApiSuccess(Object, '역할 삭제 성공')
  @ApiBadRequest('사용 중인 역할')
  @ApiForbidden('MANAGE_ROLE 권한 없음')
  @ApiNotFound('역할을 찾을 수 없음')
  removeRoleForGroup(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.roleService.removeForGroup(req.user.userId, groupId, id);
  }
}
