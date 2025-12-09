import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionCategory, PermissionCode } from '@prisma/client';

export class UpdatePermissionDto {
  @ApiProperty({
    description: '권한 코드 (고유값)',
    example: 'VIEW',
    enum: PermissionCode,
    required: false,
  })
  @IsOptional()
  @IsEnum(PermissionCode)
  code?: PermissionCode;

  @ApiProperty({
    description: '권한 이름',
    example: '그룹 조회',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: '권한 설명',
    example: '그룹 정보를 조회할 수 있는 권한',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '권한 카테고리',
    enum: PermissionCategory,
    example: 'GROUP',
    required: false,
  })
  @IsOptional()
  @IsEnum(PermissionCategory)
  category?: PermissionCategory;

  @ApiProperty({
    description: '활성화 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
