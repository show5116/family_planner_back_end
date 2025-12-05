import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Res,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/auth/auth.service';
import { SignupDto } from '@/auth/dto/signup.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { VerifyEmailDto } from '@/auth/dto/verify-email.dto';
import { ResendVerificationDto } from '@/auth/dto/resend-verification.dto';
import { RequestPasswordResetDto } from '@/auth/dto/request-password-reset.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { UpdateProfileDto } from '@/auth/dto/update-profile.dto';
import {
  SignupResponseDto,
  LoginResponseDto,
  TokenResponseDto,
  LogoutResponseDto,
  VerifyEmailResponseDto,
  ResendVerificationResponseDto,
  GetMeResponseDto,
  RequestPasswordResetResponseDto,
  ResetPasswordResponseDto,
  UpdateProfileResponseDto,
} from '@/auth/dto/auth-response.dto';
import { GoogleAuthGuard } from '@/auth/guards/google-auth.guard';
import { KakaoAuthGuard } from '@/auth/guards/kakao-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiAuthResponses } from '@/common/decorators/api-responses.decorator';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: SignupResponseDto,
  })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description:
      '웹 브라우저: Refresh Token은 HttpOnly Cookie로 설정, Access Token만 응답 바디로 반환\n' +
      '모바일 앱: Access Token과 Refresh Token 모두 응답 바디로 반환',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공, Access Token과 Refresh Token 반환',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    const userAgent = req.headers['user-agent'];

    // User-Agent를 통해 웹 브라우저인지 판별
    const isWeb = this.isWebClient(userAgent);

    if (isWeb) {
      // 웹 브라우저: HttpOnly Cookie로 Refresh Token 설정
      const cookieMaxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('app.nodeEnv') === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      // 응답에서 refreshToken 제거
      const { refreshToken, ...response } = result;
      return response;
    }

    // 모바일 앱: 응답 바디로 모든 토큰 반환
    return result;
  }

  /**
   * User-Agent 헤더로부터 웹 브라우저인지 판별
   */
  private isWebClient(userAgent?: string): boolean {
    if (!userAgent) {
      return false;
    }

    const webBrowserPatterns = [
      /Mozilla/i,
      /Chrome/i,
      /Safari/i,
      /Firefox/i,
      /Edge/i,
      /Opera/i,
    ];

    const mobileAppPatterns = [
      /FamilyPlanner-iOS/i,
      /FamilyPlanner-Android/i,
      /FamilyPlannerApp/i,
    ];

    for (const pattern of mobileAppPatterns) {
      if (pattern.test(userAgent)) {
        return false;
      }
    }

    for (const pattern of webBrowserPatterns) {
      if (pattern.test(userAgent)) {
        return true;
      }
    }

    return false;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Access Token 갱신 (RTR)',
    description:
      '웹 브라우저: Cookie에서 Refresh Token 자동 읽기, 새 Refresh Token은 Cookie로 설정\n' +
      '모바일 앱: Body에서 Refresh Token 읽기, 새 토큰들은 응답 바디로 반환',
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공, 새로운 Access Token과 Refresh Token 반환',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않거나 만료된 Refresh Token',
  })
  async refresh(
    @Request() req,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const isWeb = this.isWebClient(userAgent);

    let refreshToken: string | undefined;

    if (isWeb) {
      // 웹 브라우저: Cookie에서 Refresh Token 읽기
      refreshToken = req.cookies?.refreshToken;
    } else {
      // 모바일 앱: Body에서 Refresh Token 읽기
      refreshToken = refreshTokenDto.refreshToken;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token이 제공되지 않았습니다');
    }

    const result = await this.authService.refresh(refreshToken);

    if (isWeb) {
      // 웹 브라우저: HttpOnly Cookie로 새 Refresh Token 설정
      const cookieMaxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('app.nodeEnv') === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      // 응답에서 refreshToken 제거
      const { refreshToken: _, ...response } = result;
      return response;
    }

    // 모바일 앱: 응답 바디로 모든 토큰 반환
    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({
    summary: '로그아웃',
    description:
      '웹 브라우저: Cookie에서 Refresh Token 자동 읽기 및 Cookie 삭제\n' +
      '모바일 앱: Body에서 Refresh Token 읽기',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Refresh Token을 찾을 수 없음' })
  async logout(
    @Request() req,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const isWeb = this.isWebClient(userAgent);

    let refreshToken: string | undefined;

    if (isWeb) {
      // 웹 브라우저: Cookie에서 Refresh Token 읽기
      refreshToken = req.cookies?.refreshToken;
    } else {
      // 모바일 앱: Body에서 Refresh Token 읽기
      refreshToken = refreshTokenDto.refreshToken;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token이 제공되지 않았습니다');
    }

    const result = await this.authService.logout(refreshToken);

    if (isWeb) {
      // 웹 브라우저: Cookie 삭제
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: this.configService.get<string>('app.nodeEnv') === 'production',
        sameSite: 'strict',
      });
    }

    return result;
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: '이메일 인증' })
  @ApiResponse({
    status: 200,
    description: '이메일 인증 성공',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 인증 코드' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.code);
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: '인증 이메일 재전송' })
  @ApiResponse({
    status: 200,
    description: '인증 이메일 재전송 성공',
    type: ResendVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '이미 인증된 이메일이거나 요청 실패',
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인한 사용자 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 반환 (isAdmin, profileImage 포함)',
    type: GetMeResponseDto,
  })
  @ApiAuthResponses()
  async getProfile(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({ summary: '비밀번호 재설정 요청' })
  @ApiResponse({
    status: 200,
    description: '인증 코드가 이메일로 전송됨',
    type: RequestPasswordResetResponseDto,
  })
  @ApiResponse({ status: 400, description: '요청 실패' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({
    status: 200,
    description: '비밀번호 재설정 성공',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '유효하지 않거나 만료된 인증 코드' })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetDto.email,
      resetDto.code,
      resetDto.newPassword,
    );
  }

  @Patch('update-profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '프로필 업데이트 (이름, 프로필 이미지, 전화번호, 비밀번호)',
  })
  @ApiResponse({
    status: 200,
    description: '프로필 업데이트 성공',
    type: UpdateProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '업데이트할 정보가 없거나 비밀번호가 설정되지 않음',
  })
  @ApiAuthResponses()
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(
      req.user.userId,
      updateProfileDto.currentPassword,
      {
        name: updateProfileDto.name,
        profileImage: updateProfileDto.profileImage,
        phoneNumber: updateProfileDto.phoneNumber,
        newPassword: updateProfileDto.newPassword,
      },
    );
  }

  // ===== 소셜 로그인 =====

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google 로그인 시작' })
  @ApiResponse({ status: 302, description: 'Google OAuth 페이지로 리다이렉트' })
  async googleLogin() {
    // Guard가 자동으로 Google OAuth로 리다이렉트
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google 로그인 콜백' })
  @ApiResponse({
    status: 200,
    description: 'Google 로그인 성공, 토큰 반환',
    type: TokenResponseDto,
  })
  async googleCallback(@Request() req, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user);
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const userAgent = req.headers['user-agent'];
    const isWeb = this.isWebClient(userAgent);

    if (isWeb) {
      // 웹 브라우저: HttpOnly Cookie로 Refresh Token 설정
      const cookieMaxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('app.nodeEnv') === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      // Access Token만 쿼리 파라미터로 전달
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}`,
      );
    } else {
      // 모바일 앱: Universal Links/App Links를 통해 모든 토큰을 쿼리 파라미터로 전달
      // - iOS: apple-app-site-association 설정 시 앱에서 인터셉트
      // - Android: assetlinks.json 설정 시 앱에서 인터셉트
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    }
  }

  @Public()
  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({ summary: 'Kakao 로그인 시작' })
  @ApiResponse({ status: 302, description: 'Kakao OAuth 페이지로 리다이렉트' })
  async kakaoLogin() {
    // Guard가 자동으로 Kakao OAuth로 리다이렉트
  }

  @Public()
  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({ summary: 'Kakao 로그인 콜백' })
  @ApiResponse({
    status: 200,
    description: 'Kakao 로그인 성공, 토큰 반환',
    type: TokenResponseDto,
  })
  async kakaoCallback(@Request() req, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user);
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const userAgent = req.headers['user-agent'];
    const isWeb = this.isWebClient(userAgent);

    if (isWeb) {
      // 웹 브라우저: HttpOnly Cookie로 Refresh Token 설정
      const cookieMaxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.get<string>('app.nodeEnv') === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
      });

      // Access Token만 쿼리 파라미터로 전달
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}`,
      );
    } else {
      // 모바일 앱: Universal Links/App Links를 통해 모든 토큰을 쿼리 파라미터로 전달
      // - iOS: apple-app-site-association 설정 시 앱에서 인터셉트
      // - Android: assetlinks.json 설정 시 앱에서 인터셉트
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    }
  }
}
