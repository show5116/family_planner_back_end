import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: '현재 비밀번호 (필수)',
    example: 'currentPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: '새 비밀번호 (선택, 변경 시에만)',
    example: 'newPassword123!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '비밀번호는 영문과 숫자를 포함해야 합니다',
  })
  newPassword?: string;

  @ApiProperty({
    description: '개인 색상 (HEX 코드)',
    example: '#FF5733',
    pattern: '^#[0-9A-Fa-f]{6}$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: '유효한 HEX 색상 코드를 입력해주세요 (예: #FF5733)',
  })
  personalColor?: string;
}
