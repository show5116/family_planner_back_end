import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from '@prisma/client';

export class ReportMemberDto {
  @ApiProperty({
    description: '신고 사유',
    enum: ReportReason,
    example: ReportReason.ABUSE,
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiProperty({
    description: '상세 내용 (선택)',
    example: '지속적으로 욕설을 사용합니다.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}
