import { Body, Controller, Post, UseGuards, Get, Request } from '@nestjs/common';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 토큰' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
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
  @ApiResponse({ status: 200, description: '사용자 정보 반환' })
  @ApiResponse({ status: 401, description: '인증되지 않음' })
  async getProfile(@Request() req) {
    return req.user;
  }
}
