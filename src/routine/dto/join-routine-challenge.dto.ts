import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class JoinRoutineChallengeDto {
  @ApiProperty({
    description: '연결할 본인 소유 루틴 ID (isPrivate=true인 습관은 연결 불가)',
  })
  @IsString()
  routineId: string;
}
