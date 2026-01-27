import { ApiProperty } from '@nestjs/swagger';

export class ParticipantUserDto {
  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  name: string;

  @ApiProperty({
    description: '프로필 이미지 키',
    example: 'profile/uuid.jpg',
    nullable: true,
  })
  profileImageKey: string | null;
}

export class TaskParticipantDto {
  @ApiProperty({ description: '참여자 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Task ID', example: 'uuid' })
  taskId: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: '참여자 정보', type: ParticipantUserDto })
  user: ParticipantUserDto;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}
