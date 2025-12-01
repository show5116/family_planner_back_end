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
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email: string;

  @ApiProperty({
    description: '이메일로 받은 6자리 인증 코드',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: '인증 코드를 입력해주세요' })
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다' })
  @Matches(/^\d{6}$/, { message: '인증 코드는 6자리 숫자여야 합니다' })
  code: string;

  @ApiProperty({
    description: '새 비밀번호 (최소 6자)',
    example: 'newPassword123',
  })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  newPassword: string;
}
