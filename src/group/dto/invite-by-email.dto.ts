import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteByEmailDto {
  @ApiProperty({
    description: '초대할 사용자의 이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  @IsNotEmpty({ message: '이메일은 필수입니다' })
  @IsString()
  email: string;
}
