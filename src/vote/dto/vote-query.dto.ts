import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum VoteStatusFilter {
  ALL = 'ALL',
  ONGOING = 'ONGOING',
  CLOSED = 'CLOSED',
}

export class VoteQueryDto {
  @ApiProperty({
    description: '투표 상태 필터',
    enum: VoteStatusFilter,
    example: VoteStatusFilter.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(VoteStatusFilter)
  status?: VoteStatusFilter = VoteStatusFilter.ALL;

  @ApiProperty({ description: '페이지', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '페이지 크기', example: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
