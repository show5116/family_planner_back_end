import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
