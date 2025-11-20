import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: '이메일 인증 코드 (6자리 숫자)',
    example: '123456'
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다' })
  @Matches(/^\d{6}$/, { message: '인증 코드는 6자리 숫자여야 합니다' })
  code: string;
}
