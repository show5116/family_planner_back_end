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
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PermissionService } from '@/permission/permission.service';
import { AdminGuard } from '@/auth/admin.guard';
import { CreatePermissionDto } from '@/permission/dto/create-permission.dto';
import { UpdatePermissionDto } from '@/permission/dto/update-permission.dto';
import {
  GetAllPermissionsResponseDto,
  CreatePermissionResponseDto,
  UpdatePermissionResponseDto,
  DeletePermissionResponseDto,
  HardDeletePermissionResponseDto,
} from '@/permission/dto/permission-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiConflict,
  ApiBadRequest,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('permissions')
@Controller('permissions')
@ApiCommonAuthResponses()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
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
  @ApiSuccess(GetAllPermissionsResponseDto, '권한 목록 조회 성공')
  async getAllPermissions(@Query('category') category?: string) {
    return this.permissionService.getAllPermissions(category);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '권한 생성',
    description: '새로운 권한을 생성합니다. 운영자 전용 API',
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiCreated(CreatePermissionResponseDto)
  @ApiConflict('권한 코드 중복')
  async createPermission(
    @Request() req,
    @Body() createPermissionDto: CreatePermissionDto,
  ) {
    return this.permissionService.createPermission(
      createPermissionDto,
      req.user.userId,
    );
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
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
  @ApiSuccess(UpdatePermissionResponseDto, '권한 수정 성공')
  @ApiNotFound()
  @ApiConflict('권한 코드 중복')
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

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '권한 삭제 (소프트 삭제)',
    description: '권한을 소프트 삭제합니다 (isActive=false). 운영자 전용 API',
  })
  @ApiParam({
    name: 'id',
    description: '권한 ID',
    example: 'perm_123',
  })
  @ApiSuccess(DeletePermissionResponseDto, '권한 삭제 성공')
  @ApiNotFound()
  async deletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.deletePermission(id, req.user.userId);
  }

  @Delete(':id/hard')
  @UseGuards(AdminGuard)
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
  @ApiSuccess(HardDeletePermissionResponseDto, '권한 완전 삭제 성공')
  @ApiBadRequest('권한을 사용하는 역할이 존재함')
  @ApiNotFound()
  async hardDeletePermission(@Request() req, @Param('id') id: string) {
    return this.permissionService.hardDeletePermission(id, req.user.userId);
  }
}
