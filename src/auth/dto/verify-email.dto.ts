import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'validation.email_invalid' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '이메일 인증 코드 (6자리 숫자)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'validation.code_length' })
  @Matches(/^\d{6}$/, { message: 'validation.code_numeric' })
  code: string;
}
