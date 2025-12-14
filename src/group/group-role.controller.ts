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
import { RoleService } from '@/role/role.service';
import { CreateRoleDto } from '@/role/dto/create-role.dto';
import { UpdateRoleDto } from '@/role/dto/update-role.dto';
import { BulkUpdateRoleSortOrderDto } from '@/role/dto/bulk-update-sort-order.dto';
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

@ApiTags('그룹 역할')
@Controller('groups')
@ApiCommonAuthResponses()
export class GroupRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get(':groupId/roles')
  @UseGuards(GroupMembershipGuard)
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

  @Patch(':groupId/roles/bulk/sort-order')
  @UseGuards(GroupPermissionGuard)
  @RequirePermission(PermissionCode.MANAGE_ROLE)
  @ApiOperation({
    summary: '그룹별 역할 일괄 정렬 순서 업데이트 (MANAGE_ROLE 권한 필요)',
    description:
      '여러 역할의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.',
  })
  @ApiSuccess(Object, '정렬 순서 업데이트 성공')
  @ApiForbidden('MANAGE_ROLE 권한 없음')
  bulkUpdateSortOrderForGroup(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() bulkUpdateDto: BulkUpdateRoleSortOrderDto,
  ) {
    return this.roleService.bulkUpdateSortOrderForGroup(
      req.user.userId,
      groupId,
      bulkUpdateDto,
    );
  }
}
