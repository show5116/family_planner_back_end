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
import { PermissionService } from './permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

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
  async getAllPermissions(@Query('category') category?: string) {
    return this.permissionService.getAllPermissions(category);
  }

  /**
   * 권한 생성 (운영자 전용)
   * POST /permissions
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  async deletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.deletePermission(id, req.user.userId);
  }

  /**
   * 권한 완전 삭제 (운영자 전용, 위험)
   * DELETE /permissions/:id/hard
   */
  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async hardDeletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.hardDeletePermission(id, req.user.userId);
  }
}
