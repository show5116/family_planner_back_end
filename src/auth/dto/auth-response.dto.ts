import { ApiProperty } from '@nestjs/swagger';

/**
 * 토큰 응답 DTO (로그인, 회원가입, 토큰 갱신)
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'Access Token (JWT)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImlhdCI6MTYxNjIzOTAyMn0...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh Token (RTR 방식)',
    example: 'refresh_token_abc123def456',
  })
  refreshToken: string;
}

/**
 * 사용자 정보 DTO
 */
export class UserDto {
  @ApiProperty({
    description: '사용자 ID',
    example: 'user_clxxx123',
  })
  id: string;

  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: '이메일 인증 여부',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: '운영자 여부',
    example: false,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profileImage?: string;

  @ApiProperty({
    description: '전화번호',
    example: '010-1234-5678',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: '소셜 로그인 제공자',
    example: 'google',
    required: false,
    enum: ['google', 'kakao'],
  })
  socialProvider?: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * 회원가입 응답 DTO
 */
export class SignupResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '회원가입 성공! 이메일을 확인하여 계정을 인증해주세요.',
  })
  message: string;

  @ApiProperty({
    description: '생성된 사용자 정보',
    type: UserDto,
  })
  user: UserDto;
}

/**
 * 로그인 응답 DTO
 */
export class LoginResponseDto extends TokenResponseDto {
  @ApiProperty({
    description: '사용자 정보',
    type: UserDto,
  })
  user: UserDto;
}

/**
 * 이메일 인증 응답 DTO
 */
export class VerifyEmailResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '이메일이 성공적으로 인증되었습니다!',
  })
  message: string;
}

/**
 * 인증 이메일 재전송 응답 DTO
 */
export class ResendVerificationResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '인증 이메일이 재전송되었습니다.',
  })
  message: string;
}

/**
 * 로그아웃 응답 DTO
 */
export class LogoutResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '로그아웃되었습니다.',
  })
  message: string;
}

/**
 * 현재 사용자 정보 조회 응답 DTO
 */
export class GetMeResponseDto extends UserDto {}

/**
 * 비밀번호 재설정 요청 응답 DTO
 */
export class RequestPasswordResetResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '비밀번호 재설정 이메일이 전송되었습니다.',
  })
  message: string;
}

/**
 * 비밀번호 재설정 응답 DTO
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '비밀번호가 성공적으로 변경되었습니다.',
  })
  message: string;
}

/**
 * 프로필 업데이트 응답 DTO
 */
export class UpdateProfileResponseDto {
  @ApiProperty({
    description: '응답 메시지',
    example: '프로필이 업데이트되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '업데이트된 사용자 정보',
    type: UserDto,
  })
  user: UserDto;
}
