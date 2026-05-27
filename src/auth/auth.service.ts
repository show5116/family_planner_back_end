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
    await this.redisService.del(`refresh-token:${refreshToken}`);

    // 새로운 토큰 생성
    const tokens = await this.generateTokens(userId);

    // 새로운 Refresh Token을 Redis에 저장 (7일 TTL)
    await this.redisService.set(
      `refresh-token:${tokens.refreshToken}`,
      userId,
      this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 초 단위
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
      this.redisService.set(
        `refresh-token:${tokens.refreshToken}`,
        user.id,
        this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 초 단위
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

    // 이메일 인증 완료 및 Redis에서 코드 삭제
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
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
    await this.redisService.del(`refresh-token:${refreshToken}`);

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
   * 소셜 로그인 처리 (Google, Kakao 등)
   * - 기존 사용자: 즉시 토큰 발급
   * - 신규 사용자: 약관 동의를 위한 tempToken 반환 (계정 미생성)
   */
  async validateSocialUser(socialUser: {
    provider: string;
    providerId: string;
    email: string | null;
    name: string;
    profileImage?: string;
  }): Promise<
    | { isNewUser: false; accessToken: string; refreshToken: string }
    | { isNewUser: true; tempToken: string }
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
      return { isNewUser: true, tempToken };
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
   */
  async socialSignup(
    tempToken: string,
    agreedTerms: boolean,
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

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        profileImageKey,
        provider: payload.provider as any,
        providerId: payload.providerId,
        isEmailVerified: true,
        password: null,
        termsAgreedAt: new Date(),
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
        personalColor: true,
        createdAt: true,
        password: true,
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
      personalColor: user.personalColor,
      createdAt: user.createdAt,
      hasPassword: user.password !== null,
    };
  }

  /**
   * 프로필 업데이트 (이름, 프로필 이미지, 전화번호, 비밀번호)
   */
  async updateProfile(
    userId: string,
    currentPassword: string,
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

    // 소셜 로그인 사용자이고 비밀번호가 설정되지 않은 경우
    if (!user.password && user.provider !== 'LOCAL') {
      throw new BadRequestException('auth.errors.social_set_password_first');
    }

    // 현재 비밀번호 확인
    if (!user.password) {
      throw new BadRequestException('auth.errors.password_not_set');
    }

    const isPasswordValid = await this.verifyPassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new ForbiddenException('auth.errors.wrong_current_password');
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

  private readonly ACCOUNT_DELETION_GRACE_DAYS = 7;

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
   * deletedAt이 설정된 계정만 대상 — R2 → Redis → DB 순서로 제거
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

    if (user.profileImageKey) {
      try {
        await this.storageService.deleteFile(user.profileImageKey);
      } catch (error) {
        this.logger.warn(
          `Failed to delete profile image for user ${userId}: ${error.message}`,
        );
      }
    }

    await this.redisService.deleteAllRefreshTokensByUserId(userId);
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '계정이 즉시 삭제되었습니다' };
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

  /**
   * 유예 기간 만료 계정 하드 삭제 (크론잡 전용)
   * deletedAt <= 현재 시간인 계정을 R2 → Redis → DB 순서로 완전 제거
   */
  async purgeExpiredAccounts() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: { lte: new Date() } },
      select: { id: true, profileImageKey: true },
    });

    if (users.length === 0) return { purged: 0 };

    await Promise.all(
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
      }),
    );

    await this.prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    });

    this.logger.log(`Purged ${users.length} expired accounts`);
    return { purged: users.length };
  }
}
