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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GroupMemberService } from '@/group/group-member.service';
import { GroupInviteService } from '@/group/group-invite.service';
import { UpdateMemberRoleDto } from '@/group/dto/update-member-role.dto';
import { UpdateMyColorDto } from '@/group/dto/update-my-color.dto';
import { TransferOwnershipDto } from '@/group/dto/transfer-ownership.dto';
import { JoinGroupDto } from '@/group/dto/join-group.dto';
import { InviteByEmailDto } from '@/group/dto/invite-by-email.dto';
import {
  GroupMemberDto,
  LeaveGroupResponseDto,
  UpdateMyColorResponseDto,
  RemoveMemberResponseDto,
  InviteCodeResponseDto,
  TransferOwnershipResponseDto,
  InviteByEmailResponseDto,
  GroupJoinRequestDto,
  AcceptJoinRequestResponseDto,
  RejectJoinRequestResponseDto,
  JoinGroupResponseDto,
  CancelInviteResponseDto,
  ResendInviteResponseDto,
} from '@/group/dto/group-response.dto';
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
  @ApiOperation({
    summary: '초대 코드로 그룹 가입',
    description:
      '초대 코드를 입력하여 그룹에 가입합니다.\n\n' +
      '**이메일 초대를 받은 경우**: 즉시 그룹 멤버로 추가됩니다.\n' +
      '**일반 가입 요청**: 관리자(INVITE_MEMBER 권한)의 승인이 필요합니다.',
  })
  @ApiCreated(JoinGroupResponseDto, '그룹 가입 성공 또는 가입 요청 성공')
  @ApiNotFound('유효하지 않은 초대 코드 또는 만료된 초대 코드')
  @ApiConflict('이미 그룹 멤버이거나 가입 요청이 대기 중')
  joinByInviteCode(@Request() req, @Body() joinGroupDto: JoinGroupDto) {
    return this.groupInviteService.joinByInviteCode(
      req.user.userId,
      joinGroupDto.inviteCode,
    );
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '그룹 나가기' })
  @ApiSuccess(LeaveGroupResponseDto, '그룹 나가기 성공')
  @ApiBadRequest('OWNER는 나갈 수 없음')
  @ApiNotFound('그룹 멤버를 찾을 수 없음')
  leave(@Param('id') id: string, @Request() req) {
    return this.groupMemberService.leave(id, req.user.userId);
  }

  @Get(':id/members')
  @UseGuards(GroupMembershipGuard)
  @ApiOperation({ summary: '그룹 멤버 목록 조회' })
  @ApiSuccess(GroupMemberDto, '멤버 목록 반환', { isArray: true })
  @ApiForbidden('접근 권한 없음')
  getMembers(@Param('id') id: string) {
    return this.groupMemberService.getMembers(id);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_MEMBER)
  @ApiOperation({ summary: '멤버 역할 변경 (MANAGE_MEMBER 권한 필요)' })
  @ApiSuccess(GroupMemberDto, '역할 변경 성공')
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
  @ApiSuccess(UpdateMyColorResponseDto, '색상 설정 성공')
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
  @ApiSuccess(RemoveMemberResponseDto, '멤버 삭제 성공')
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
  @ApiSuccess(InviteCodeResponseDto, '초대 코드 재생성 성공')
  @ApiForbidden('권한 없음')
  regenerateInviteCode(@Param('id') id: string) {
    return this.groupInviteService.regenerateInviteCode(id);
  }

  @Post(':id/invite-by-email')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '이메일로 그룹 초대 (INVITE_MEMBER 권한 필요)',
    description:
      '초대할 사용자의 이메일로 초대 코드가 포함된 이메일을 발송합니다. 해당 이메일로 가입된 사용자가 있어야 합니다.',
  })
  @ApiSuccess(InviteByEmailResponseDto, '초대 이메일 발송 성공')
  @ApiBadRequest('해당 이메일로 가입된 사용자가 없음')
  @ApiConflict('이미 그룹 멤버임')
  @ApiForbidden('권한 없음')
  @ApiNotFound('그룹을 찾을 수 없음')
  inviteByEmail(
    @Param('id') id: string,
    @Request() req,
    @Body() inviteByEmailDto: InviteByEmailDto,
  ) {
    return this.groupInviteService.inviteByEmail(
      id,
      req.user.userId,
      inviteByEmailDto.email,
    );
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({
    summary: 'OWNER 권한 양도 (현재 OWNER만 가능)',
    description:
      '그룹의 OWNER 권한을 다른 멤버에게 양도합니다. 양도 후 현재 OWNER는 MEMBER 역할로 변경됩니다.',
  })
  @ApiSuccess(TransferOwnershipResponseDto, 'OWNER 권한 양도 성공')
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

  @Get(':id/join-requests')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '그룹 가입 요청 목록 조회 (INVITE_MEMBER 권한 필요)',
    description:
      'status 쿼리 파라미터로 필터링 가능 (PENDING, ACCEPTED, REJECTED)',
  })
  @ApiSuccess(GroupJoinRequestDto, '가입 요청 목록 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('권한 없음')
  getJoinRequests(@Param('id') id: string, @Query('status') status?: string) {
    return this.groupInviteService.getJoinRequests(id, status);
  }

  @Post(':id/join-requests/:requestId/accept')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '가입 요청 승인 (INVITE_MEMBER 권한 필요)',
    description: 'PENDING 상태의 가입 요청을 승인하고 그룹 멤버로 추가',
  })
  @ApiSuccess(AcceptJoinRequestResponseDto, '가입 요청 승인 성공')
  @ApiBadRequest('해당 이메일로 가입된 사용자가 없음')
  @ApiConflict('이미 처리된 요청 또는 이미 그룹 멤버임')
  @ApiForbidden('권한 없음')
  @ApiNotFound('가입 요청을 찾을 수 없음')
  acceptJoinRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.groupInviteService.acceptJoinRequest(id, requestId);
  }

  @Post(':id/join-requests/:requestId/reject')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '가입 요청 거부 (INVITE_MEMBER 권한 필요)',
    description: 'PENDING 상태의 가입 요청을 거부',
  })
  @ApiSuccess(RejectJoinRequestResponseDto, '가입 요청 거부 성공')
  @ApiConflict('이미 처리된 요청')
  @ApiForbidden('권한 없음')
  @ApiNotFound('가입 요청을 찾을 수 없음')
  rejectJoinRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.groupInviteService.rejectJoinRequest(id, requestId);
  }

  @Delete(':id/invites/:requestId')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '초대 취소 (INVITE_MEMBER 권한 필요)',
    description: 'INVITE 타입의 PENDING 상태 초대를 취소합니다',
  })
  @ApiSuccess(CancelInviteResponseDto, '초대 취소 성공')
  @ApiBadRequest('INVITE 타입의 요청만 취소 가능')
  @ApiConflict('대기 중인 초대만 취소 가능')
  @ApiForbidden('권한 없음')
  @ApiNotFound('초대 요청을 찾을 수 없음')
  cancelInvite(@Param('id') id: string, @Param('requestId') requestId: string) {
    return this.groupInviteService.cancelInvite(id, requestId);
  }

  @Post(':id/invites/:requestId/resend')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.INVITE_MEMBER)
  @ApiOperation({
    summary: '초대 재전송 (INVITE_MEMBER 권한 필요)',
    description: 'INVITE 타입의 PENDING 상태 초대 이메일을 재전송합니다',
  })
  @ApiSuccess(ResendInviteResponseDto, '초대 이메일 재전송 성공')
  @ApiBadRequest('INVITE 타입의 요청만 재전송 가능')
  @ApiConflict('대기 중인 초대만 재전송 가능')
  @ApiForbidden('권한 없음')
  @ApiNotFound('초대 요청을 찾을 수 없음')
  resendInvite(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    return this.groupInviteService.resendInvite(id, requestId, req.user.userId);
  }
}
