import { Body, Controller, Post, UseGuards, Get, Request, Res, Patch } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공, Access Token과 Refresh Token 반환' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Access Token 갱신 (RTR)' })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공, 새로운 Access Token과 Refresh Token 반환',
  })
  @ApiResponse({ status: 401, description: '유효하지 않거나 만료된 Refresh Token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  @ApiResponse({ status: 404, description: 'Refresh Token을 찾을 수 없음' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Post('verify-email')
  @ApiOperation({ summary: '이메일 인증' })
  @ApiResponse({ status: 200, description: '이메일 인증 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 인증 코드' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.code);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: '인증 이메일 재전송' })
  @ApiResponse({ status: 200, description: '인증 이메일 재전송 성공' })
  @ApiResponse({ status: 400, description: '이미 인증된 이메일이거나 요청 실패' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인한 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환 (isAdmin, profileImage 포함)' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  async getProfile(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: '비밀번호 재설정 요청' })
  @ApiResponse({ status: 200, description: '인증 코드가 이메일로 전송됨' })
  @ApiResponse({ status: 400, description: '요청 실패' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestDto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 인증 코드' })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetDto.email,
      resetDto.code,
      resetDto.newPassword,
    );
  }

  @Patch('update-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 업데이트 (이름, 프로필 이미지, 전화번호, 비밀번호)' })
  @ApiResponse({ status: 200, description: '프로필 업데이트 성공' })
  @ApiResponse({ status: 400, description: '업데이트할 정보가 없거나 비밀번호가 설정되지 않음' })
  @ApiResponse({ status: 401, description: '현재 비밀번호가 올바르지 않거나 인증되지 않음' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto.currentPassword, {
      name: updateProfileDto.name,
      profileImage: updateProfileDto.profileImage,
      phoneNumber: updateProfileDto.phoneNumber,
      newPassword: updateProfileDto.newPassword,
    });
  }

  // ===== 소셜 로그인 =====

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google 로그인 시작' })
  @ApiResponse({ status: 302, description: 'Google OAuth 페이지로 리다이렉트' })
  async googleLogin() {
    // Guard가 자동으로 Google OAuth로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google 로그인 콜백' })
  @ApiResponse({ status: 200, description: 'Google 로그인 성공, 토큰 반환' })
  async googleCallback(@Request() req, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
    // Universal Links/App Links를 통해 웹앱 및 모바일 앱 모두 지원
    // - 웹: 웹 페이지로 이동
    // - iOS: apple-app-site-association 설정 시 앱에서 인터셉트
    // - Android: assetlinks.json 설정 시 앱에서 인터셉트
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({ summary: 'Kakao 로그인 시작' })
  @ApiResponse({ status: 302, description: 'Kakao OAuth 페이지로 리다이렉트' })
  async kakaoLogin() {
    // Guard가 자동으로 Kakao OAuth로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({ summary: 'Kakao 로그인 콜백' })
  @ApiResponse({ status: 200, description: 'Kakao 로그인 성공, 토큰 반환' })
  async kakaoCallback(@Request() req, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
    // Universal Links/App Links를 통해 웹앱 및 모바일 앱 모두 지원
    // - 웹: 웹 페이지로 이동
    // - iOS: apple-app-site-association 설정 시 앱에서 인터셉트
    // - Android: assetlinks.json 설정 시 앱에서 인터셉트
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
