import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RoutineQueryDto {
  @ApiProperty({ description: '활성 루틴만 조회', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ description: '특정 루틴 그룹 소속만 조회', required: false })
  @IsOptional()
  @IsString()
  routineGroupId?: string;
}
