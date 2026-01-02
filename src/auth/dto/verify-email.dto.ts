import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '이메일 인증 코드 (6자리 숫자)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다' })
  @Matches(/^\d{6}$/, { message: '인증 코드는 6자리 숫자여야 합니다' })
  code: string;
}
