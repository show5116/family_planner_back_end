import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteByEmailDto {
  @ApiProperty({
    description: '초대할 사용자의 이메일',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'validation.email_invalid' })
  @IsNotEmpty({ message: 'validation.email_required_short' })
  @IsString()
  email: string;
}
