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
import { GroupMemberService } from '@/group/group-member.service';
import { GroupInviteService } from '@/group/group-invite.service';
import { UpdateMemberRoleDto } from '@/group/dto/update-member-role.dto';
import { UpdateMyColorDto } from '@/group/dto/update-my-color.dto';
import { TransferOwnershipDto } from '@/group/dto/transfer-ownership.dto';
import { JoinGroupDto } from '@/group/dto/join-group.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiConflict,
  ApiBadRequest,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import {
  GroupPermissionGuard,
  RequirePermission,
  GroupMembershipGuard,
} from '@/group/guards';
import { PermissionCode } from '@prisma/client';

@ApiTags('그룹 멤버')
@Controller('groups')
@ApiCommonAuthResponses()
export class GroupMemberController {
  constructor(
    private readonly groupMemberService: GroupMemberService,
    private readonly groupInviteService: GroupInviteService,
  ) {}

  @Post('join')
  @ApiOperation({ summary: '초대 코드로 그룹 가입' })
  @ApiCreated(Object, '그룹 가입 성공')
  @ApiNotFound('유효하지 않은 초대 코드')
  @ApiConflict('이미 그룹 멤버임')
  joinByInviteCode(@Request() req, @Body() joinGroupDto: JoinGroupDto) {
    return this.groupInviteService.joinByInviteCode(
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
    return this.groupMemberService.leave(id, req.user.userId);
  }

  @Get(':id/members')
  @UseGuards(GroupMembershipGuard)
  @ApiOperation({ summary: '그룹 멤버 목록 조회' })
  @ApiSuccess(Object, '멤버 목록 반환')
  @ApiForbidden('접근 권한 없음')
  getMembers(@Param('id') id: string) {
    return this.groupMemberService.getMembers(id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_MEMBER)
  @ApiOperation({ summary: '멤버 역할 변경 (MANAGE_MEMBER 권한 필요)' })
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
    return this.groupMemberService.updateMemberRole(
      id,
      targetUserId,
      req.user.userId,
      updateMemberRoleDto.roleId,
    );
  }

  @Patch(':id/my-color')
  @UseGuards(GroupMembershipGuard)
  @ApiOperation({ summary: '개인 그룹 색상 설정' })
  @ApiSuccess(Object, '색상 설정 성공')
  @ApiForbidden('접근 권한 없음')
  updateMyColor(
    @Param('id') id: string,
    @Request() req,
    @Body() updateMyColorDto: UpdateMyColorDto,
  ) {
    return this.groupMemberService.updateMyColor(
      id,
      req.user.userId,
      updateMyColorDto.customColor,
    );
  }

  @Delete(':id/members/:userId')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_MEMBER)
  @ApiOperation({ summary: '멤버 삭제 (MANAGE_MEMBER 권한 필요)' })
  @ApiSuccess(Object, '멤버 삭제 성공')
  @ApiBadRequest('자신은 삭제 불가 또는 OWNER 삭제 불가')
  @ApiForbidden('권한 없음')
  @ApiNotFound('멤버를 찾을 수 없음')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req,
  ) {
    return this.groupMemberService.removeMember(
      id,
      targetUserId,
      req.user.userId,
    );
  }

  @Post(':id/regenerate-code')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '초대 코드 재생성 (INVITE_MEMBER 권한 필요)',
  })
  @ApiSuccess(Object, '초대 코드 재생성 성공')
  @ApiForbidden('권한 없음')
  regenerateInviteCode(@Param('id') id: string) {
    return this.groupInviteService.regenerateInviteCode(id);
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
    return this.groupMemberService.transferOwnership(
      id,
      req.user.userId,
      transferOwnershipDto.newOwnerId,
    );
  }
}
