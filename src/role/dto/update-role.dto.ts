import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

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
    example: ['group:read', 'group:update', 'member:read'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
