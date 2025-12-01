import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { PermissionCategory } from '@prisma/client';

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PermissionCategory)
  category?: PermissionCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
