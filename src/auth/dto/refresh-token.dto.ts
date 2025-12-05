import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Refresh Token (웹 브라우저는 Cookie에서 자동으로 읽음, 모바일 앱은 필수)',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
