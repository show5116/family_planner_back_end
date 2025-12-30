import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({
    description: '그룹 ID',
    example: 'uuid',
    nullable: true,
  })
  groupId: string | null;

  @ApiProperty({ description: '카테고리 이름', example: '업무' })
  name: string;

  @ApiProperty({
    description: '설명',
    example: '업무 관련 일정',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '이모지', example: '💼', nullable: true })
  emoji: string | null;

  @ApiProperty({
    description: '색상 코드 (HEX)',
    example: '#3B82F6',
    nullable: true,
  })
  color: string | null;

  @ApiProperty({
    description: '생성일',
    example: '2025-12-30T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정일',
    example: '2025-12-30T00:00:00Z',
  })
  updatedAt: Date;
}
