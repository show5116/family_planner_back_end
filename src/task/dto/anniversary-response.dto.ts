import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneConfigDto } from './create-anniversary.dto';

export class AnniversaryDto {
  @ApiProperty({ description: '기념일 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid' })
  groupId: string;

  @ApiProperty({ description: '기념일 이름', example: '연애 시작일' })
  title: string;

  @ApiProperty({
    description: '기념일 날짜',
    example: '2023-01-01T00:00:00.000Z',
  })
  date: Date;

  @ApiPropertyOptional({ description: '이모지', example: '💑', nullable: true })
  emoji: string | null;

  @ApiPropertyOptional({
    description: 'milestone Task 자동 생성 설정',
    type: MilestoneConfigDto,
    nullable: true,
  })
  milestoneConfig: MilestoneConfigDto | null;

  @ApiProperty({
    description: '오늘 기준 경과일 (기념일로부터 D+N, 미래면 음수)',
    example: 320,
  })
  daysSince: number;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;
}
