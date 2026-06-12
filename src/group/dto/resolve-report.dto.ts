import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ResolveReportDto {
  @ApiProperty({
    description: '처리 상태',
    enum: [
      ReportStatus.REVIEWING,
      ReportStatus.RESOLVED,
      ReportStatus.DISMISSED,
    ],
    example: ReportStatus.RESOLVED,
  })
  @IsEnum([
    ReportStatus.REVIEWING,
    ReportStatus.RESOLVED,
    ReportStatus.DISMISSED,
  ])
  status: ReportStatus;

  @ApiProperty({
    description: '처리 메모',
    example: '확인 후 경고 조치 완료',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolveNote?: string;
}
