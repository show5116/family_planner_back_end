import { IsString, IsEnum, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { PermissionCategory } from '@prisma/client';

export class CreatePermissionDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PermissionCategory)
  category: PermissionCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
