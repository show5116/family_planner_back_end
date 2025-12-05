import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

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
    example: ['group:read', 'group:update', 'member:read'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
