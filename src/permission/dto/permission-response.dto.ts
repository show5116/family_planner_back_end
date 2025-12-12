import { ApiProperty } from '@nestjs/swagger';
import { PermissionCategory, PermissionCode } from '@prisma/client';

/**
 * 권한 정보 DTO
 */
export class PermissionDto {
  @ApiProperty({
    description: '권한 ID',
    example: 'perm_clxxx123',
  })
  id: string;

  @ApiProperty({
    description: '권한 코드',
    example: 'VIEW',
    enum: PermissionCode,
  })
  code: PermissionCode;

  @ApiProperty({
    description: '권한 이름',
    example: '그룹 조회',
  })
  name: string;

  @ApiProperty({
    description: '권한 설명',
    example: '그룹 정보를 조회할 수 있는 권한',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: '권한 카테고리',
    enum: PermissionCategory,
    example: 'GROUP',
  })
  category: PermissionCategory;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '정렬 순서 (낮을수록 먼저 표시)',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * 전체 권한 목록 조회 응답 DTO
 */
export class GetAllPermissionsResponseDto {
  @ApiProperty({
    description: '전체 권한 목록',
    type: [PermissionDto],
  })
  permissions: PermissionDto[];

  @ApiProperty({
    description: '카테고리별로 그룹화된 권한',
    example: {
      GROUP: [
        {
          id: 'perm_clxxx123',
          code: 'group:read',
          name: '그룹 조회',
          description: '그룹 정보를 조회할 수 있는 권한',
          category: 'GROUP',
        },
      ],
      SCHEDULE: [
        {
          id: 'perm_clxxx456',
          code: 'schedule:read',
          name: '일정 조회',
          description: '일정 정보를 조회할 수 있는 권한',
          category: 'SCHEDULE',
        },
      ],
    },
  })
  groupedByCategory: Record<string, PermissionDto[]>;

  @ApiProperty({
    description: '사용 가능한 카테고리 목록',
    enum: PermissionCategory,
    isArray: true,
    example: ['GROUP', 'SCHEDULE', 'TASK', 'BUDGET', 'PHOTO', 'ADMIN'],
  })
  categories: PermissionCategory[];
}

/**
 * 권한 생성 응답 DTO
 */
export class CreatePermissionResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '권한이 생성되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '생성된 권한 정보',
    type: PermissionDto,
  })
  permission: PermissionDto;
}

/**
 * 권한 수정 응답 DTO
 */
export class UpdatePermissionResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '권한이 수정되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '수정된 권한 정보',
    type: PermissionDto,
  })
  permission: PermissionDto;
}

/**
 * 권한 삭제 응답 DTO
 */
export class DeletePermissionResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '권한이 비활성화되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '삭제된 권한 정보',
    type: PermissionDto,
  })
  permission: PermissionDto;
}

/**
 * 권한 완전 삭제 응답 DTO
 */
export class HardDeletePermissionResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '권한이 완전히 삭제되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '삭제된 권한 정보',
    type: PermissionDto,
  })
  deletedPermission: PermissionDto;
}
