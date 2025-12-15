import { ApiProperty } from '@nestjs/swagger';
import { PermissionCode } from '@prisma/client';

export class RoleDto {
  @ApiProperty({ description: '역할 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '역할명', example: 'OWNER' })
  name: string;

  @ApiProperty({
    description: '그룹 ID (null이면 공통 역할)',
    example: null,
    nullable: true,
  })
  groupId: string | null;

  @ApiProperty({
    description: '기본 역할 여부',
    example: false,
  })
  isDefaultRole: boolean;

  @ApiProperty({
    description: '권한 배열',
    example: ['VIEW', 'CREATE', 'UPDATE'],
    enum: PermissionCode,
    isArray: true,
  })
  permissions: PermissionCode[];

  @ApiProperty({
    description: '역할 색상 (HEX 형식)',
    example: '#6366F1',
  })
  color: string;

  @ApiProperty({
    description: '정렬 순서 (낮을수록 먼저 표시)',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({ description: '생성일', example: '2025-12-04T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-04T00:00:00Z' })
  updatedAt: Date;
}

export class GetAllRolesResponseDto {
  @ApiProperty({ type: [RoleDto] })
  data: RoleDto[];
}

export class CreateRoleResponseDto {
  @ApiProperty({ type: RoleDto })
  data: RoleDto;
}

export class UpdateRoleResponseDto {
  @ApiProperty({ type: RoleDto })
  data: RoleDto;
}

export class DeleteRoleResponseDto {
  @ApiProperty({ example: '역할이 삭제되었습니다' })
  message: string;

  @ApiProperty({ type: RoleDto })
  deletedRole: RoleDto;
}
