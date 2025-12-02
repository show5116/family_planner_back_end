import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiQuery,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * 전체 권한 목록 조회 (UI에서 권한 선택 시 사용)
   * GET /permissions
   * Query: category (optional) - 특정 카테고리만 조회
   * 인증 필요
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '전체 권한 목록 조회',
    description: 'UI에서 권한 선택 시 사용. 카테고리별 필터링 가능',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: '특정 카테고리만 조회 (선택사항, null 허용)',
    example: 'GROUP',
  })
  @ApiResponse({
    status: 200,
    description: '권한 목록 조회 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  async getAllPermissions(@Query('category') category?: string) {
    return this.permissionService.getAllPermissions(category);
  }

  /**
   * 권한 생성 (운영자 전용)
   * POST /permissions
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '권한 생성',
    description: '새로운 권한을 생성합니다. 운영자 전용 API',
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({
    status: 201,
    description: '권한 생성 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (운영자 전용)',
  })
  async createPermission(
    @Request() req,
    @Body() createPermissionDto: CreatePermissionDto,
  ) {
    return this.permissionService.createPermission(
      createPermissionDto,
      req.user.userId,
    );
  }

  /**
   * 권한 수정 (운영자 전용)
   * PATCH /permissions/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '권한 수정',
    description: '기존 권한 정보를 수정합니다. 운영자 전용 API',
  })
  @ApiParam({
    name: 'id',
    description: '권한 ID',
    example: 'perm_123',
  })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({
    status: 200,
    description: '권한 수정 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (운영자 전용)',
  })
  @ApiResponse({
    status: 404,
    description: '권한을 찾을 수 없음',
  })
  async updatePermission(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionService.updatePermission(
      id,
      updatePermissionDto,
      req.user.userId,
    );
  }

  /**
   * 권한 삭제 (운영자 전용)
   * DELETE /permissions/:id
   * 주의: 실제로 삭제하지 않고 isActive=false로 변경 (소프트 삭제)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '권한 삭제 (소프트 삭제)',
    description: '권한을 소프트 삭제합니다 (isActive=false). 운영자 전용 API',
  })
  @ApiParam({
    name: 'id',
    description: '권한 ID',
    example: 'perm_123',
  })
  @ApiResponse({
    status: 200,
    description: '권한 삭제 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (운영자 전용)',
  })
  @ApiResponse({
    status: 404,
    description: '권한을 찾을 수 없음',
  })
  async deletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.deletePermission(id, req.user.userId);
  }

  /**
   * 권한 완전 삭제 (운영자 전용, 위험)
   * DELETE /permissions/:id/hard
   */
  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '권한 완전 삭제 (하드 삭제)',
    description:
      '권한을 데이터베이스에서 완전히 삭제합니다. 위험한 작업이므로 주의 필요. 운영자 전용 API',
  })
  @ApiParam({
    name: 'id',
    description: '권한 ID',
    example: 'perm_123',
  })
  @ApiResponse({
    status: 200,
    description: '권한 완전 삭제 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음 (운영자 전용)',
  })
  @ApiResponse({
    status: 404,
    description: '권한을 찾을 수 없음',
  })
  async hardDeletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.hardDeletePermission(id, req.user.userId);
  }
}
