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
import {
  GetAllRolesResponseDto,
  CreateRoleResponseDto,
  UpdateRoleResponseDto,
  DeleteRoleResponseDto,
} from '@/role/dto/role-response.dto';
import { AdminGuard } from '@/auth/admin.guard';
import { ApiCommonAdminResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiConflict,
  ApiBadRequest,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('역할(Role) - 공통 역할 관리')
@Controller('roles')
@UseGuards(AdminGuard)
@ApiCommonAdminResponses()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({
    summary: '공통 역할 전체 조회 (운영자 전용)',
    description:
      '⚠️ groupId=null인 공통 역할만 조회합니다. 그룹별 역할은 GET /groups/:groupId/roles 사용',
  })
  @ApiSuccess(GetAllRolesResponseDto, '공통 역할 목록 반환 (groupId=null)')
  async findAll(@Request() req) {
    return this.roleService.findAllCommon(req.user.userId);
  }

  @Post()
  @ApiOperation({
    summary: '공통 역할 생성 (운영자 전용)',
    description:
      '⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 생성합니다. 그룹별 역할은 POST /groups/:groupId/roles 사용',
  })
  @ApiCreated(CreateRoleResponseDto)
  @ApiBadRequest('groupId가 제공된 경우 (그룹별 역할은 다른 엔드포인트 사용)')
  @ApiConflict('역할명 중복')
  async create(@Request() req, @Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(req.user.userId, createRoleDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '공통 역할 수정 (운영자 전용)',
    description:
      '⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 수정합니다. 그룹별 역할은 PATCH /groups/:groupId/roles/:id 사용',
  })
  @ApiSuccess(UpdateRoleResponseDto, '역할 수정 성공')
  @ApiBadRequest(
    'OWNER 역할은 수정 불가 또는 groupId가 null이 아닌 경우 (그룹별 역할은 다른 엔드포인트 사용)',
  )
  @ApiNotFound()
  @ApiConflict('역할명 중복')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(req.user.userId, id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '공통 역할 삭제 (운영자 전용)',
    description:
      '⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 삭제합니다. 그룹별 역할은 DELETE /groups/:groupId/roles/:id 사용',
  })
  @ApiSuccess(DeleteRoleResponseDto, '역할 삭제 성공')
  @ApiBadRequest(
    'OWNER 역할은 삭제 불가 또는 사용 중인 역할 또는 groupId가 null이 아닌 경우 (그룹별 역할은 다른 엔드포인트 사용)',
  )
  @ApiNotFound()
  async remove(@Param('id') id: string, @Request() req) {
    return this.roleService.remove(req.user.userId, id);
  }
}
