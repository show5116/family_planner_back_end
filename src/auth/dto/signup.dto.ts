import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (최소 6자)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '홍길동', description: '사용자 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
