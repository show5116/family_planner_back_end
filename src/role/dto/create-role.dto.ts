import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { PermissionCode } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty({
    description: '역할명',
    example: 'ADMIN',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: '그룹 ID (null이면 공통 역할)',
    example: null,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  groupId?: string | null;

  @ApiProperty({
    description: '기본 역할 여부 (초대 시 자동 부여)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultRole?: boolean;

  @ApiProperty({
    description: '권한 배열',
    example: ['VIEW', 'CREATE', 'UPDATE'],
    enum: PermissionCode,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PermissionCode, { each: true })
  permissions: PermissionCode[];

  @ApiProperty({
    description: '정렬 순서 (낮을수록 먼저 표시)',
    example: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
