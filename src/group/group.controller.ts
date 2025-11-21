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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('그룹')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: '그룹 생성' })
  @ApiResponse({ status: 201, description: '그룹 생성 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  create(@Request() req, @Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(req.user.userId, createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: '내가 속한 그룹 목록 조회' })
  @ApiResponse({ status: 200, description: '그룹 목록 반환' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  findMyGroups(@Request() req) {
    return this.groupService.findMyGroups(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '그룹 상세 조회' })
  @ApiResponse({ status: 200, description: '그룹 상세 정보 반환' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.groupService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '그룹 정보 수정 (OWNER, ADMIN만)' })
  @ApiResponse({ status: 200, description: '그룹 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(id, req.user.userId, updateGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '그룹 삭제 (OWNER만)' })
  @ApiResponse({ status: 200, description: '그룹 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  remove(@Param('id') id: string, @Request() req) {
    return this.groupService.remove(id, req.user.userId);
  }

  @Post('join')
  @ApiOperation({ summary: '초대 코드로 그룹 가입' })
  @ApiResponse({ status: 201, description: '그룹 가입 성공' })
  @ApiResponse({ status: 404, description: '유효하지 않은 초대 코드' })
  @ApiResponse({ status: 409, description: '이미 그룹 멤버임' })
  joinByInviteCode(@Request() req, @Body() joinGroupDto: JoinGroupDto) {
    return this.groupService.joinByInviteCode(
      req.user.userId,
      joinGroupDto.inviteCode,
    );
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '그룹 나가기' })
  @ApiResponse({ status: 200, description: '그룹 나가기 성공' })
  @ApiResponse({ status: 400, description: 'OWNER는 나갈 수 없음' })
  @ApiResponse({ status: 404, description: '그룹 멤버를 찾을 수 없음' })
  leave(@Param('id') id: string, @Request() req) {
    return this.groupService.leave(id, req.user.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '그룹 멤버 목록 조회' })
  @ApiResponse({ status: 200, description: '멤버 목록 반환' })
  @ApiResponse({ status: 403, description: '접근 권한 없음' })
  getMembers(@Param('id') id: string, @Request() req) {
    return this.groupService.getMembers(id, req.user.userId);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: '멤버 역할 변경 (OWNER만)' })
  @ApiResponse({ status: 200, description: '역할 변경 성공' })
  @ApiResponse({ status: 400, description: '자신의 역할은 변경 불가' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '멤버를 찾을 수 없음' })
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
      updateMemberRoleDto.role,
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '멤버 삭제 (OWNER, ADMIN만)' })
  @ApiResponse({ status: 200, description: '멤버 삭제 성공' })
  @ApiResponse({ status: 400, description: '자신은 삭제 불가 또는 OWNER 삭제 불가' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '멤버를 찾을 수 없음' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req,
  ) {
    return this.groupService.removeMember(id, targetUserId, req.user.userId);
  }

  @Post(':id/regenerate-code')
  @ApiOperation({ summary: '초대 코드 재생성 (OWNER, ADMIN만)' })
  @ApiResponse({ status: 200, description: '초대 코드 재생성 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  regenerateInviteCode(@Param('id') id: string, @Request() req) {
    return this.groupService.regenerateInviteCode(id, req.user.userId);
  }
}
