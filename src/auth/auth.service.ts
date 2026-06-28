import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/email/email.service';
import { StorageService } from '@/storage/storage.service';
import { RedisService } from '@/redis/redis.service';
import { WebhookService } from '@/webhook/webhook.service';
import { SignupDto } from '@/auth/dto/signup.dto';
import { JwtPayload } from '@/auth/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly VERIFICATION_CODE_LENGTH = 6;
  private readonly VERIFICATION_CODE_EXPIRY_HOURS = 24;
  private readonly PASSWORD_RESET_CODE_EXPIRY_HOURS = 1;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private readonly BCRYPT_SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    private storageService: StorageService,
    private redisService: RedisService,
    private i18n: I18nService,
    private webhookService: WebhookService,
  ) {}

  /**
   * 인증 코드 생성 (6자리 숫자)
   */
  private generateVerificationCode(): string {
    const min = Math.pow(10, this.VERIFICATION_CODE_LENGTH - 1);
    const max = Math.pow(10, this.VERIFICATION_CODE_LENGTH) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * 비밀번호 해싱
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
  }

  /**
   * 비밀번호 검증
   */
  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 회원가입
   */
  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('auth.errors.email_exists');
    }

    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(password);

    // 이메일 인증 코드 생성
    const verificationCode = this.generateVerificationCode();

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'LOCAL',
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isEmailVerified: true,
      },
    });

    // Redis에 이메일 인증 코드 저장 (24시간 TTL)
    await this.redisService.set(
      `email-verification:${email}`,
      verificationCode,
      this.VERIFICATION_CODE_EXPIRY_HOURS * 60 * 60, // 초 단위
    );

    // 이메일 인증 메일 발송
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        name,
        I18nContext.current()?.lang ?? 'ko',
      );
    } catch (error) {
      // 이메일 전송 실패 시 사용자에게 알림 (하지만 회원가입은 완료)
      return {
        message: this.i18n.t('auth.errors.signup_email_failed', {
          lang: I18nContext.current()?.lang ?? 'ko',
        }),
        user,
      };
    }

    return {
      message: this.i18n.t('auth.success.signup', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      user,
    };
  }

  /**
   * 사용자 인증 (Local Strategy에서 사용)
   */
  async validateUser(email: string, password: string) {
    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // 비밀번호 확인
    if (!user.password) {
      // 소셜 로그인 사용자가 비밀번호를 설정하지 않은 경우
      return null;
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // 이메일 인증 확인 (LOCAL 로그인 사용자만)
    if (user.provider === 'LOCAL' && !user.isEmailVerified) {
      throw new ForbiddenException('auth.errors.email_verification_required');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageKey: user.profileImageKey,
      isAdmin: user.isAdmin,
      hasPassword: user.password !== null,
      personalColor: user.personalColor,
    };
  }

  /**
   * Refresh Token으로 새로운 Access Token 발급 (RTR)
   */
  async refresh(refreshToken: string) {
    // Redis에서 Refresh Token 검증
    const userId = await this.redisService.get<string>(
      `refresh-token:${refreshToken}`,
    );

    if (!userId) {
      throw new UnauthorizedException('auth.errors.invalid_refresh_token');
    }

    // 기존 토큰 무효화 (RTR)
    await this.redisService.deleteRefreshToken(refreshToken, userId);

    // 새로운 토큰 생성
    const tokens = await this.generateTokens(userId);

    // 새로운 Refresh Token을 Redis에 저장 (7일 TTL)
    await this.redisService.setRefreshToken(
      tokens.refreshToken,
      userId,
      this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Access Token과 Refresh Token 생성
   */
  private async generateTokens(userId: string) {
    // 사용자 정보 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('auth.errors.user_not_found');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || '',
      name: user.name,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiration = this.configService.get<string>(
      'jwt.accessExpiration',
    );
    const refreshExpiration = this.configService.get<string>(
      'jwt.refreshExpiration',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration,
      } as any),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration,
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 로그인 처리 공통 함수
   * Refresh Token을 Redis에 저장 및 마지막 로그인 시간 업데이트
   */
  async handleLoginSuccess(user: {
    id: string;
    email: string | null;
    name: string;
    profileImageKey: string | null;
    isAdmin: boolean;
    hasPassword: boolean;
    personalColor?: string | null;
  }) {
    // 토큰 생성
    const tokens = await this.generateTokens(user.id);

    // Refresh Token을 Redis에 저장 (RTR, 7일 TTL) 및 마지막 로그인 시간 업데이트
    await Promise.all([
      this.redisService.setRefreshToken(
        tokens.refreshToken,
        user.id,
        this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      ),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageKey
          ? this.storageService.getPublicUrl(user.profileImageKey)
          : null,
        isAdmin: user.isAdmin,
        hasPassword: user.hasPassword,
        personalColor: user.personalColor ?? null,
      },
    };
  }

  /**
   * 이메일 인증
   */
  async verifyEmail(code: string, email: string) {
    // Redis에서 인증 코드 조회
    const storedCode = await this.redisService.get<string>(
      `email-verification:${email}`,
    );

    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('auth.errors.invalid_verification_code');
    }

    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('auth.errors.user_not_found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('auth.errors.already_verified');
    }

    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

    // 이메일 인증 완료 및 Redis에서 코드 삭제
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          subscriptionTier: 'ad_free',
          subscriptionExpiresAt: trialExpiresAt,
        },
      }),
      this.redisService.del(`email-verification:${email}`),
    ]);

    return {
      message: this.i18n.t('auth.success.email_verified', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 인증 이메일 재전송
   */
  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('auth.errors.user_not_found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('auth.errors.already_verified');
    }

    if (user.provider !== 'LOCAL') {
      throw new BadRequestException(
        'auth.errors.social_no_verification_needed',
      );
    }

    // 새로운 인증 코드 생성
    const verificationCode = this.generateVerificationCode();

    // Redis에 인증 코드 저장 (24시간 TTL, 기존 코드는 자동으로 덮어씀)
    await this.redisService.set(
      `email-verification:${email}`,
      verificationCode,
      this.VERIFICATION_CODE_EXPIRY_HOURS * 60 * 60, // 초 단위
    );

    // 이메일 발송
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        user.name,
        I18nContext.current()?.lang ?? 'ko',
      );
    } catch {
      throw new BadRequestException('auth.errors.email_send_failed');
    }

    return {
      message: this.i18n.t('auth.success.verification_email_resent', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 로그아웃 (Refresh Token 무효화)
   */
  async logout(refreshToken: string) {
    const userId = await this.redisService.get<string>(
      `refresh-token:${refreshToken}`,
    );
    if (userId) {
      await this.redisService.deleteRefreshToken(refreshToken, userId);
    } else {
      await this.redisService.del(`refresh-token:${refreshToken}`);
    }

    return {
      message: this.i18n.t('auth.success.logout', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 비밀번호 재설정 요청
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('auth.errors.user_not_found');
    }

    // 인증 코드 생성
    const resetCode = this.generateVerificationCode();

    // Redis에 비밀번호 재설정 코드 저장 (1시간 TTL)
    await this.redisService.set(
      `password-reset:${email}`,
      resetCode,
      this.PASSWORD_RESET_CODE_EXPIRY_HOURS * 60 * 60, // 초 단위
    );

    // 이메일 발송
    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        resetCode,
        user.name,
        I18nContext.current()?.lang ?? 'ko',
      );
    } catch {
      throw new BadRequestException('auth.errors.email_send_failed');
    }

    return {
      message: this.i18n.t('auth.success.password_reset_code_sent', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 비밀번호 재설정
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    // Redis에서 비밀번호 재설정 코드 조회
    const storedCode = await this.redisService.get<string>(
      `password-reset:${email}`,
    );

    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('auth.errors.invalid_email_or_code');
    }

    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('auth.errors.user_not_found');
    }

    // 새 비밀번호 해싱
    const hashedPassword = await this.hashPassword(newPassword);

    // 비밀번호 업데이트 및 Redis에서 코드 삭제
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      this.redisService.del(`password-reset:${email}`),
    ]);

    return {
      message: this.i18n.t('auth.success.password_reset', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 모바일 Google 로그인 (ID Token 검증)
   */
  async googleMobileLogin(idToken: string) {
    const client = new OAuth2Client();

    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: [
          this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
          this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
          this.configService.get<string>('GOOGLE_CLIENT_ID'), // Web Client ID (토큰 audience로 사용될 수 있음)
        ].filter(Boolean),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('auth.errors.invalid_google_token');
    }

    return this.validateSocialUser({
      provider: 'GOOGLE',
      providerId: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? payload.email ?? '사용자',
      profileImage: payload.picture,
    });
  }

  /**
   * 모바일 Kakao 로그인 (액세스 토큰 검증)
   * Flutter kakao_flutter_sdk에서 발급받은 액세스 토큰을 카카오 API로 검증
   */
  async kakaoMobileLogin(accessToken: string) {
    let data: any;
    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });
      if (!response.ok) {
        throw new Error(`Kakao API error: ${response.status}`);
      }
      data = await response.json();
    } catch {
      throw new UnauthorizedException('auth.errors.invalid_kakao_token');
    }

    const kakaoAccount = data.kakao_account;

    return this.validateSocialUser({
      provider: 'KAKAO',
      providerId: data.id.toString(),
      email: kakaoAccount?.email ?? null,
      name:
        kakaoAccount?.profile?.nickname ??
        data.properties?.nickname ??
        '사용자',
      profileImage: kakaoAccount?.profile?.profile_image_url,
    });
  }

  /**
   * 모바일 Apple 로그인 (identity token 검증)
   * Flutter sign_in_with_apple 패키지에서 발급받은 identityToken을 Apple 공개키로 검증
   */
  async appleMobileLogin(identityToken: string, name?: string | null) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appleSignin = require('apple-signin-auth');

    let payload: any;
    try {
      payload = await appleSignin.verifyIdToken(identityToken, {
        audience: this.configService.get<string>('oauth.apple.clientId'),
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('auth.errors.invalid_apple_token');
    }

    const email = payload.email ?? null;
    // privaterelay 이메일이면 이메일 기반 이름 fallback 사용 안 함 (needsName 유도)
    const isPrivate = this.isApplePrivateEmail(email);
    const displayName =
      name?.trim() || (!isPrivate ? email?.split('@')[0] : null) || '사용자';

    return this.validateSocialUser({
      provider: 'APPLE',
      providerId: payload.sub,
      email,
      name: displayName,
      profileImage: null,
    });
  }

  private isApplePrivateEmail(email: string | null): boolean {
    return !!email && email.endsWith('@privaterelay.appleid.com');
  }

  /**
   * 소셜 로그인 처리 (Google, Kakao 등)
   * - 기존 사용자: 즉시 토큰 발급
   * - 신규 사용자: 약관 동의를 위한 tempToken 반환 (계정 미생성)
   *   needsName: 이름을 소셜에서 받지 못한 경우
   *   needsEmail: 이메일이 없거나 Apple 비공개 이메일인 경우
   */
  async validateSocialUser(socialUser: {
    provider: string;
    providerId: string;
    email: string | null;
    name: string;
    profileImage?: string;
  }): Promise<
    | { isNewUser: false; accessToken: string; refreshToken: string }
    | {
        isNewUser: true;
        tempToken: string;
        needsName: boolean;
        needsEmail: boolean;
      }
  > {
    const user = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: socialUser.provider as any,
          providerId: socialUser.providerId,
        },
      },
    });

    if (!user) {
      const needsName = !socialUser.name || socialUser.name === '사용자';
      const needsEmail =
        !socialUser.email || this.isApplePrivateEmail(socialUser.email);

      // 신규 유저: 계정 생성 없이 tempToken 발급 (TTL 10분)
      const tempToken = this.jwtService.sign(
        {
          provider: socialUser.provider,
          providerId: socialUser.providerId,
          email: socialUser.email,
          name: socialUser.name,
          profileImage: socialUser.profileImage ?? null,
        },
        {
          expiresIn: '10m',
          secret: this.configService.get('jwt.accessSecret'),
        },
      );
      return { isNewUser: true, tempToken, needsName, needsEmail };
    }

    // 기존 사용자: 프로필 이미지 없으면 백그라운드로 저장
    if (!user.profileImageKey && socialUser.profileImage) {
      this.storageService
        .uploadImageFromUrl(
          socialUser.profileImage,
          'profiles',
          `${socialUser.provider}-${socialUser.providerId}`,
        )
        .then(({ key }) =>
          this.prisma.user.update({
            where: { id: user.id },
            data: { profileImageKey: key },
          }),
        )
        .catch((err) =>
          this.logger.warn(`Failed to save profile image: ${err.message}`),
        );
    }

    const tokens = await this.handleLoginSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageKey: user.profileImageKey,
      isAdmin: user.isAdmin,
      hasPassword: user.password !== null,
      personalColor: user.personalColor,
    });
    return { isNewUser: false, ...tokens };
  }

  /**
   * 소셜 신규 회원가입 완료 (약관 동의 후 호출)
   * tempToken 검증 → 계정 생성 → 토큰 발급
   * name/email: 클라이언트가 입력한 값이 tempToken의 값보다 우선 적용
   */
  async socialSignup(
    tempToken: string,
    agreedTerms: boolean,
    inputName?: string,
    inputEmail?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!agreedTerms) {
      throw new BadRequestException('auth.errors.terms_required');
    }

    let payload: {
      provider: string;
      providerId: string;
      email: string | null;
      name: string;
      profileImage: string | null;
    };
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('auth.errors.invalid_temp_token');
    }

    // 클라이언트가 입력한 name/email 우선 적용, 없으면 소셜 데이터 사용
    const finalName = inputName?.trim() || payload.name?.trim() || '사용자';
    const rawEmail =
      inputEmail?.trim() ||
      (!this.isApplePrivateEmail(payload.email) ? payload.email : null);

    // 이메일 형식 검증
    if (rawEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        throw new BadRequestException('auth.errors.invalid_email_format');
      }
    }

    const finalEmail = rawEmail;

    // 이메일 중복 체크
    if (finalEmail) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: finalEmail },
      });
      if (emailExists) {
        throw new ConflictException('auth.errors.email_exists');
      }
    }

    // 중복 가입 방지 (약관 동의 화면에서 두 번 제출하는 경우)
    const existing = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: payload.provider as any,
          providerId: payload.providerId,
        },
      },
    });
    if (existing) {
      return this.handleLoginSuccess({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        profileImageKey: existing.profileImageKey,
        isAdmin: existing.isAdmin,
        hasPassword: existing.password !== null,
        personalColor: existing.personalColor,
      });
    }

    let profileImageKey: string | undefined;
    if (payload.profileImage) {
      try {
        const result = await this.storageService.uploadImageFromUrl(
          payload.profileImage,
          'profiles',
          `${payload.provider}-${payload.providerId}`,
        );
        profileImageKey = result.key;
      } catch (err) {
        this.logger.warn(
          `Failed to upload social profile image: ${err.message}`,
        );
      }
    }

    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

    const user = await this.prisma.user.create({
      data: {
        email: finalEmail,
        name: finalName,
        profileImageKey,
        provider: payload.provider as any,
        providerId: payload.providerId,
        isEmailVerified: true,
        password: null,
        termsAgreedAt: new Date(),
        subscriptionTier: 'ad_free',
        subscriptionExpiresAt: trialExpiresAt,
      },
    });

    return this.handleLoginSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageKey: user.profileImageKey,
      isAdmin: user.isAdmin,
      hasPassword: user.password !== null,
      personalColor: user.personalColor,
    });
  }

  /**
   * 현재 사용자 정보 조회 (lastLoginAt 업데이트)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageKey: true,
        isAdmin: true,
        isSuperAdmin: true,
        personalColor: true,
        createdAt: true,
        password: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('auth.errors.user_not_found');
    }

    // lastLoginAt 업데이트 (비동기로 처리하여 응답 속도에 영향 없도록)
    this.prisma.user
      .update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to update lastLoginAt for user ${userId}`,
          error,
        );
      });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageKey
        ? this.storageService.getPublicUrl(user.profileImageKey)
        : null,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      personalColor: user.personalColor,
      createdAt: user.createdAt,
      hasPassword: user.password !== null,
      scheduledDeleteAt: user.deletedAt ?? null,
    };
  }

  /**
   * 프로필 업데이트 (이름, 프로필 이미지, 전화번호, 비밀번호)
   */
  async updateProfile(
    userId: string,
    currentPassword: string | undefined,
    updates: {
      name?: string;
      phoneNumber?: string;
      newPassword?: string;
      personalColor?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('auth.errors.user_not_found');
    }

    if (user.password) {
      // 비밀번호가 있는 사용자는 현재 비밀번호 검증 필수
      if (!currentPassword) {
        throw new BadRequestException('auth.errors.current_password_required');
      }
      const isPasswordValid = await this.verifyPassword(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new ForbiddenException('auth.errors.wrong_current_password');
      }
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.phoneNumber !== undefined) {
      updateData.phoneNumber = updates.phoneNumber;
    }

    if (updates.newPassword) {
      updateData.password = await this.hashPassword(updates.newPassword);
    }

    if (updates.personalColor !== undefined) {
      updateData.personalColor = updates.personalColor;
    }

    // 업데이트할 내용이 없는 경우
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('auth.errors.nothing_to_update');
    }

    // 프로필 업데이트
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        profileImageKey: true,
        phoneNumber: true,
        isAdmin: true,
        personalColor: true,
        createdAt: true,
      },
    });

    return {
      message: this.i18n.t('auth.success.profile_updated', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
      user: {
        ...updatedUser,
        phoneNumber: this.maskPhoneNumber(updatedUser.phoneNumber),
      },
    };
  }

  private maskPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return phone ?? null;
    // 010-1234-5678 → 010-****-5678
    return phone.replace(/(\d{3})-(\d{3,4})-(\d{4})/, '$1-****-$3');
  }

  /**
   * 사용자 ID로 사용자 조회 (profileImageKey 포함)
   * @param userId - 사용자 ID
   * @returns 사용자 정보
   */
  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageKey: true,
        phoneNumber: true,
        isAdmin: true,
      },
    });
  }

  /**
   * 프로필 이미지 키 업데이트
   * @param userId - 사용자 ID
   * @param profileImageKey - 프로필 이미지 키
   */
  async updateProfileImageKey(userId: string, profileImageKey: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImageKey },
    });
  }

  async updateLocation(userId: string, lat: number, lon: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLat: lat, lastLon: lon },
    });
    return {
      message: this.i18n.t('auth.success.location_updated', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  async getMyDataExport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        provider: true,
        language: true,
        subscriptionTier: true,
        termsAgreedAt: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        groupMemberships: {
          select: {
            groupId: true,
            joinedAt: true,
            roleId: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            priority: true,
            status: true,
            scheduledAt: true,
            dueAt: true,
            completedAt: true,
            location: true,
            createdAt: true,
          },
          where: { deletedAt: null },
        },
        recurrings: {
          select: {
            id: true,
            ruleType: true,
            ruleConfig: true,
            isActive: true,
            createdAt: true,
          },
        },
        memos: {
          select: {
            id: true,
            title: true,
            content: true,
            visibility: true,
            isPinned: true,
            createdAt: true,
            updatedAt: true,
          },
          where: { deletedAt: null },
        },
        expenses: {
          select: {
            id: true,
            type: true,
            amount: true,
            category: true,
            date: true,
            description: true,
            paymentMethod: true,
            isConfirmed: true,
            createdAt: true,
          },
        },
        recurringExpenses: {
          select: {
            id: true,
            type: true,
            amount: true,
            category: true,
            description: true,
            dayOfMonth: true,
            isActive: true,
            createdAt: true,
          },
        },
        budgets: {
          select: {
            id: true,
            category: true,
            amount: true,
            month: true,
            createdAt: true,
          },
        },
        accounts: {
          select: {
            id: true,
            name: true,
            institution: true,
            type: true,
            createdAt: true,
          },
        },
        merchants: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        childProfiles: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            createdAt: true,
          },
        },
        childcareTransactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            createdAt: true,
          },
        },
        votesCreated: {
          select: {
            id: true,
            title: true,
            description: true,
            isMultiple: true,
            isAnonymous: true,
            endsAt: true,
            createdAt: true,
          },
        },
        voteBallots: {
          select: {
            id: true,
            optionId: true,
            votedAt: true,
          },
        },
        questions: {
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            status: true,
            createdAt: true,
          },
          where: { deletedAt: null },
        },
        notifications: {
          select: {
            id: true,
            title: true,
            body: true,
            createdAt: true,
          },
          take: 200,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (!user.email) {
      throw new BadRequestException(
        '이메일이 등록되지 않아 데이터를 전송할 수 없습니다',
      );
    }

    const {
      tasks,
      recurrings,
      memos,
      expenses,
      recurringExpenses,
      budgets,
      accounts,
      merchants,
      childProfiles,
      childcareTransactions,
      votesCreated,
      voteBallots,
      questions,
      notifications,
      groupMemberships,
      ...profile
    } = user;

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ZipArchive } = require('archiver');
      const archive = new ZipArchive({ zlib: { level: 6 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      const buf = (s: string) => Buffer.from(s, 'utf-8');

      archive.append(
        buf(JSON.stringify({ exportedAt: new Date(), ...profile }, null, 2)),
        { name: 'profile.json' },
      );
      archive.append(
        buf(
          this.toCsv(groupMemberships, ['그룹ID', '가입일', '역할ID'], (r) => [
            r.groupId,
            r.joinedAt,
            r.roleId,
          ]),
        ),
        { name: 'groups.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            tasks,
            [
              'id',
              '제목',
              '설명',
              '유형',
              '우선순위',
              '상태',
              '예정일',
              '마감일',
              '완료일',
              '장소',
              '생성일',
            ],
            (r) => [
              r.id,
              r.title,
              r.description,
              r.type,
              r.priority,
              r.status,
              r.scheduledAt,
              r.dueAt,
              r.completedAt,
              r.location,
              r.createdAt,
            ],
          ),
        ),
        { name: 'tasks.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            recurrings,
            ['id', '반복유형', '활성여부', '생성일'],
            (r) => [r.id, r.ruleType, r.isActive, r.createdAt],
          ),
        ),
        { name: 'recurring_tasks.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            memos,
            ['id', '제목', '내용', '공개범위', '고정여부', '생성일', '수정일'],
            (r) => [
              r.id,
              r.title,
              r.content,
              r.visibility,
              r.isPinned,
              r.createdAt,
              r.updatedAt,
            ],
          ),
        ),
        { name: 'memos.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            expenses,
            [
              'id',
              '유형',
              '금액',
              '카테고리',
              '날짜',
              '설명',
              '결제수단',
              '확정여부',
              '생성일',
            ],
            (r) => [
              r.id,
              r.type,
              r.amount,
              r.category,
              r.date,
              r.description,
              r.paymentMethod,
              r.isConfirmed,
              r.createdAt,
            ],
          ),
        ),
        { name: 'expenses.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            recurringExpenses,
            [
              'id',
              '유형',
              '금액',
              '카테고리',
              '설명',
              '결제일',
              '활성여부',
              '생성일',
            ],
            (r) => [
              r.id,
              r.type,
              r.amount,
              r.category,
              r.description,
              r.dayOfMonth,
              r.isActive,
              r.createdAt,
            ],
          ),
        ),
        { name: 'recurring_expenses.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            budgets,
            ['id', '카테고리', '금액', '월', '생성일'],
            (r) => [r.id, r.category, r.amount, r.month, r.createdAt],
          ),
        ),
        { name: 'budgets.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            accounts,
            ['id', '이름', '금융기관', '유형', '생성일'],
            (r) => [r.id, r.name, r.institution, r.type, r.createdAt],
          ),
        ),
        { name: 'accounts.csv' },
      );
      archive.append(
        buf(
          this.toCsv(merchants, ['id', '이름', '생성일'], (r) => [
            r.id,
            r.name,
            r.createdAt,
          ]),
        ),
        { name: 'merchants.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            childProfiles,
            ['id', '이름', '생년월일', '생성일'],
            (r) => [r.id, r.name, r.birthDate, r.createdAt],
          ),
        ),
        { name: 'children.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            childcareTransactions,
            ['id', '유형', '금액', '설명', '생성일'],
            (r) => [r.id, r.type, r.amount, r.description, r.createdAt],
          ),
        ),
        { name: 'childcare_transactions.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            votesCreated,
            ['id', '제목', '설명', '복수선택', '익명여부', '종료일', '생성일'],
            (r) => [
              r.id,
              r.title,
              r.description,
              r.isMultiple,
              r.isAnonymous,
              r.endsAt,
              r.createdAt,
            ],
          ),
        ),
        { name: 'votes.csv' },
      );
      archive.append(
        buf(
          this.toCsv(voteBallots, ['id', '선택지ID', '투표일'], (r) => [
            r.id,
            r.optionId,
            r.votedAt,
          ]),
        ),
        { name: 'vote_ballots.csv' },
      );
      archive.append(
        buf(
          this.toCsv(
            questions,
            ['id', '제목', '내용', '카테고리', '상태', '생성일'],
            (r) => [
              r.id,
              r.title,
              r.content,
              r.category,
              r.status,
              r.createdAt,
            ],
          ),
        ),
        { name: 'questions.csv' },
      );
      archive.append(
        buf(
          this.toCsv(notifications, ['id', '제목', '내용', '생성일'], (r) => [
            r.id,
            r.title,
            r.body,
            r.createdAt,
          ]),
        ),
        { name: 'notifications.csv' },
      );

      archive.finalize();
    });

    const filename = `my-data-${new Date().toISOString().slice(0, 10)}.zip`;
    await this.emailService.sendDataExportEmail(
      user.email,
      user.name,
      zipBuffer,
      filename,
    );

    return { message: '데이터 내보내기 파일을 이메일로 전송했습니다' };
  }

  private toCsv<T>(
    rows: T[],
    headers: string[],
    mapper: (row: T) => unknown[],
  ): string {
    const escape = (v: unknown) => {
      const str = v == null ? '' : String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => mapper(r).map(escape).join(',')),
    ];
    return '﻿' + lines.join('\r\n'); // BOM 추가로 엑셀 한글 깨짐 방지
  }

  private readonly ACCOUNT_DELETION_GRACE_DAYS = 7;

  async deleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.deletedAt) {
      throw new BadRequestException('이미 삭제 예약된 계정입니다');
    }

    const scheduledAt = new Date();
    scheduledAt.setDate(
      scheduledAt.getDate() + this.ACCOUNT_DELETION_GRACE_DAYS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: scheduledAt },
    });

    return {
      message: `계정 삭제가 예약되었습니다. ${this.ACCOUNT_DELETION_GRACE_DAYS}일 후 완전히 삭제됩니다`,
      scheduledDeleteAt: scheduledAt,
    };
  }

  async cancelDeleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (!user.deletedAt) {
      throw new BadRequestException('삭제 예약된 계정이 아닙니다');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    return { message: '계정 삭제 예약이 취소되었습니다' };
  }

  /**
   * 계정 삭제 예약 (운영자 전용, 7일 유예)
   * deletedAt을 설정하여 소프트 삭제 — 실제 제거는 크론잡이 처리
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.deletedAt) {
      throw new BadRequestException('이미 삭제 예약된 계정입니다');
    }

    const scheduledAt = new Date();
    scheduledAt.setDate(
      scheduledAt.getDate() + this.ACCOUNT_DELETION_GRACE_DAYS,
    );

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: scheduledAt },
      }),
      this.redisService.deleteAllRefreshTokensByUserId(userId),
    ]);

    return {
      message: `계정 삭제가 예약되었습니다. ${this.ACCOUNT_DELETION_GRACE_DAYS}일 후 완전히 삭제됩니다`,
      scheduledDeleteAt: scheduledAt,
    };
  }

  /**
   * 삭제 예약 계정 즉시 완전 삭제 (운영자 전용)
   * 검증 후 즉시 202 응답 — R2/Redis/DB 삭제는 백그라운드 처리
   * 결과는 Discord로 알림
   */
  async forceDeleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profileImageKey: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (!user.deletedAt) {
      throw new BadRequestException('삭제 예약된 계정이 아닙니다');
    }

    // 백그라운드에서 실제 삭제 처리
    this.executeHardDelete(userId, user.profileImageKey).catch(() => {});

    return {
      message:
        '계정 삭제가 시작되었습니다. 완료 시 Discord로 알림이 전송됩니다.',
    };
  }

  private async executeHardDelete(
    userId: string,
    profileImageKey: string | null,
  ): Promise<void> {
    try {
      if (profileImageKey) {
        try {
          await this.storageService.deleteFile(profileImageKey);
        } catch (error) {
          this.logger.warn(
            `Failed to delete profile image for user ${userId}: ${error.message}`,
          );
        }
      }

      await this.redisService.deleteAllRefreshTokensByUserId(userId);
      await this.prisma.user.delete({ where: { id: userId } });

      await this.webhookService.sendAccountDeletionResult(userId, true);
    } catch (error) {
      this.logger.error(`계정 삭제 실패 userId=${userId}`, error);
      await this.webhookService.sendAccountDeletionResult(
        userId,
        false,
        error.message,
      );
    }
  }

  /**
   * 계정 삭제 예약 취소 (운영자 전용)
   */
  async cancelDeleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (!user.deletedAt) {
      throw new BadRequestException('삭제 예약된 계정이 아닙니다');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    return { message: '계정 삭제 예약이 취소되었습니다' };
  }

  async grantAdmin(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new BadRequestException(
        '자기 자신에게는 권한을 부여할 수 없습니다',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isAdmin: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.isAdmin) {
      throw new BadRequestException('이미 운영자 권한을 가진 사용자입니다');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin: true },
    });

    return { message: '운영자 권한이 부여되었습니다' };
  }

  async revokeAdmin(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new BadRequestException('자기 자신의 권한은 회수할 수 없습니다');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isAdmin: true, isSuperAdmin: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.isSuperAdmin) {
      throw new ForbiddenException('슈퍼 어드민의 권한은 회수할 수 없습니다');
    }

    if (!user.isAdmin) {
      throw new BadRequestException('운영자 권한이 없는 사용자입니다');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin: false },
    });

    return { message: '운영자 권한이 회수되었습니다' };
  }

  /**
   * 유예 기간 만료 계정 하드 삭제 (크론잡 전용)
   * deletedAt <= 현재 시간인 계정을 R2 → Redis → DB 순서로 완전 제거
   * 실패한 계정은 개별 Discord 알림
   */
  async purgeExpiredAccounts() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: { lte: new Date() } },
      select: { id: true, profileImageKey: true },
    });

    if (users.length === 0) return { purged: 0 };

    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (user.profileImageKey) {
          try {
            await this.storageService.deleteFile(user.profileImageKey);
          } catch (error) {
            this.logger.warn(
              `Failed to delete profile image for user ${user.id}: ${error.message}`,
            );
          }
        }
        await this.redisService.deleteAllRefreshTokensByUserId(user.id);
        return user.id;
      }),
    );

    const succeededIds: string[] = [];
    const failedEntries: { reason: string; user: { id: string } }[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        succeededIds.push(r.value);
      } else {
        failedEntries.push({ reason: r.reason?.message, user: users[i] });
      }
    });

    if (succeededIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: { id: { in: succeededIds } },
      });
    }

    await Promise.all(
      failedEntries.map(({ reason, user }) =>
        this.webhookService.sendAccountDeletionResult(user.id, false, reason),
      ),
    );

    this.logger.log(
      `Purged ${succeededIds.length} expired accounts` +
        (failedEntries.length > 0 ? `, ${failedEntries.length} failed` : ''),
    );
    return { purged: succeededIds.length, failed: failedEntries.length };
  }
}
