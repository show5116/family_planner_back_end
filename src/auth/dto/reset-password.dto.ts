import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'validation.email_invalid' })
  @IsNotEmpty({ message: 'validation.email_required' })
  email: string;

  @ApiProperty({
    description: '이메일로 받은 6자리 인증 코드',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.code_required' })
  @Length(6, 6, { message: 'validation.code_length' })
  @Matches(/^\d{6}$/, { message: 'validation.code_numeric' })
  code: string;

  @ApiProperty({
    description: '새 비밀번호 (최소 6자)',
    example: 'newPassword123',
  })
  @IsString()
  @IsNotEmpty({ message: 'validation.password_required' })
  @MinLength(6, { message: 'validation.password_min_6' })
  newPassword: string;
}
