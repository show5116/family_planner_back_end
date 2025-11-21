import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinGroupDto {
  @ApiProperty({
    description: '그룹 초대 코드',
    example: 'ABC123XYZ',
  })
  @IsString()
  inviteCode: string;
}
