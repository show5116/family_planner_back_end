import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: '비밀번호를 재설정할 계정의 이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'validation.email_invalid' })
  @IsNotEmpty({ message: 'validation.email_required' })
  email: string;
}
