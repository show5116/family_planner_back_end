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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleService } from '@/role/role.service';
import { CreateRoleDto } from '@/role/dto/create-role.dto';
import { UpdateRoleDto } from '@/role/dto/update-role.dto';
import {
  GetAllRolesResponseDto,
  CreateRoleResponseDto,
  UpdateRoleResponseDto,
  DeleteRoleResponseDto,
  RoleDto,
} from '@/role/dto/role-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/auth/admin.guard';

@ApiTags('역할(Role)')
@Controller('roles')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: '역할 전체 조회 (운영자 전용)' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['common'],
    description: 'common: 공통 역할만 조회',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: '특정 그룹의 역할만 조회',
  })
  @ApiResponse({
    status: 200,
    description: '역할 목록 반환',
    type: GetAllRolesResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '운영자 권한 필요' })
  async findAll(
    @Request() req,
    @Query('type') type?: 'common',
    @Query('groupId') groupId?: string,
  ) {
    return this.roleService.findAll(req.user.userId, type, groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: '역할 단건 조회 (운영자 전용)' })
  @ApiResponse({
    status: 200,
    description: '역할 정보 반환',
    type: RoleDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '운영자 권한 필요' })
  @ApiResponse({ status: 404, description: '역할을 찾을 수 없음' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.roleService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: '역할 생성 (운영자 전용)' })
  @ApiResponse({
    status: 201,
    description: '역할 생성 성공',
    type: CreateRoleResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '운영자 권한 필요' })
  @ApiResponse({ status: 409, description: '역할명 중복' })
  async create(@Request() req, @Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(req.user.userId, createRoleDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '역할 수정 (운영자 전용)' })
  @ApiResponse({
    status: 200,
    description: '역할 수정 성공',
    type: UpdateRoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'OWNER 역할은 수정 불가' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '운영자 권한 필요' })
  @ApiResponse({ status: 404, description: '역할을 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '역할명 중복' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(req.user.userId, id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '역할 삭제 (운영자 전용)' })
  @ApiResponse({
    status: 200,
    description: '역할 삭제 성공',
    type: DeleteRoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'OWNER 역할은 삭제 불가 또는 사용 중인 역할',
  })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  @ApiResponse({ status: 403, description: '운영자 권한 필요' })
  @ApiResponse({ status: 404, description: '역할을 찾을 수 없음' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.roleService.remove(req.user.userId, id);
  }
}
