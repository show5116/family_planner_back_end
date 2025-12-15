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
  Matches,
} from 'class-validator';
import { PermissionCode } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({
    description: '역할명',
    example: 'ADMIN',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    description: '기본 역할 여부 (초대 시 자동 부여)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultRole?: boolean;

  @ApiProperty({
    description: '권한 배열',
    example: ['VIEW', 'CREATE', 'UPDATE'],
    enum: PermissionCode,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PermissionCode, { each: true })
  permissions?: PermissionCode[];

  @ApiProperty({
    description: '역할 색상 (HEX 형식)',
    example: '#6366F1',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: '색상은 HEX 형식이어야 합니다 (예: #6366F1)',
  })
  color?: string;

  @ApiProperty({
    description: '정렬 순서 (낮을수록 먼저 표시)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
