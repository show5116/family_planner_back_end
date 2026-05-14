import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StorageType } from './create-storage.dto';

export class UpdateStorageDto {
  @ApiProperty({ example: '냉장고 1', maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ enum: StorageType, required: false })
  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;
}
