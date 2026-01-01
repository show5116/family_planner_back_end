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
import * as bcrypt from 'bcrypt';
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
   * 만료 날짜 계산
   */
  private calculateExpiryDate(hours: number): Date {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate;
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
      throw new ConflictException('이미 사용 중인 이메일입니다');
    }

    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(password);

    // 이메일 인증 코드 생성
    const verificationCode = this.generateVerificationCode();
    const verificationExpires = this.calculateExpiryDate(
      this.VERIFICATION_CODE_EXPIRY_HOURS,
    );

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'LOCAL',
        emailVerificationToken: verificationCode,
        emailVerificationExpires: verificationExpires,
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

    // 이메일 인증 메일 발송
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        name,
      );
    } catch (error) {
      // 이메일 전송 실패 시 사용자에게 알림 (하지만 회원가입은 완료)
      return {
        message:
          '회원가입이 완료되었지만, 인증 이메일 전송에 실패했습니다. 인증 이메일 재전송을 요청해주세요.',
        user,
      };
    }

    return {
      message: '회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.',
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
      throw new ForbiddenException(
        '이메일 인증이 필요합니다. 이메일을 확인해주세요',
      );
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageKey: user.profileImageKey,
      isAdmin: user.isAdmin,
      hasPassword: user.password !== null,
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
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다');
    }

    // 기존 토큰 무효화 (RTR)
    await this.redisService.del(`refresh-token:${refreshToken}`);

    // 새로운 토큰 생성
    const tokens = await this.generateTokens(userId);

    // 새로운 Refresh Token을 Redis에 저장 (7일 TTL)
    await this.redisService.set(
      `refresh-token:${tokens.refreshToken}`,
      userId,
      this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
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
      throw new NotFoundException('사용자를 찾을 수 없습니다');
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
  }) {
    // 토큰 생성
    const tokens = await this.generateTokens(user.id);

    // Refresh Token을 Redis에 저장 (RTR, 7일 TTL) 및 마지막 로그인 시간 업데이트
    await Promise.all([
      this.redisService.set(
        `refresh-token:${tokens.refreshToken}`,
        user.id,
        this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
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
      },
    };
  }

  /**
   * 이메일 인증
   */
  async verifyEmail(code: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: code },
    });

    if (!user) {
      throw new BadRequestException('유효하지 않은 인증 코드입니다');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('이미 인증된 이메일입니다');
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException(
        '인증 코드가 만료되었습니다. 인증 이메일을 재전송해주세요',
      );
    }

    // 이메일 인증 완료
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: '이메일 인증이 완료되었습니다' };
  }

  /**
   * 인증 이메일 재전송
   */
  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('이미 인증된 이메일입니다');
    }

    if (user.provider !== 'LOCAL') {
      throw new BadRequestException(
        '소셜 로그인 사용자는 이메일 인증이 필요하지 않습니다',
      );
    }

    // 새로운 인증 코드 생성
    const verificationCode = this.generateVerificationCode();
    const verificationExpires = this.calculateExpiryDate(
      this.VERIFICATION_CODE_EXPIRY_HOURS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationCode,
        emailVerificationExpires: verificationExpires,
      },
    });

    // 이메일 발송
    try {
      await this.emailService.sendVerificationEmail(
        email,
        verificationCode,
        user.name,
      );
    } catch {
      throw new BadRequestException('이메일 전송에 실패했습니다');
    }

    return { message: '인증 이메일이 재전송되었습니다' };
  }

  /**
   * 로그아웃 (Refresh Token 무효화)
   */
  async logout(refreshToken: string) {
    // Redis에서 Refresh Token 삭제
    const exists = await this.redisService.has(
      `refresh-token:${refreshToken}`,
    );

    if (!exists) {
      throw new NotFoundException('Refresh Token을 찾을 수 없습니다');
    }

    await this.redisService.del(`refresh-token:${refreshToken}`);

    return { message: '로그아웃되었습니다' };
  }

  /**
   * 비밀번호 재설정 요청
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 인증 코드 생성
    const resetCode = this.generateVerificationCode();
    const resetExpires = this.calculateExpiryDate(
      this.PASSWORD_RESET_CODE_EXPIRY_HOURS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetCode,
        passwordResetExpires: resetExpires,
      },
    });

    // 이메일 발송
    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        resetCode,
        user.name,
      );
    } catch {
      throw new BadRequestException('이메일 전송에 실패했습니다');
    }

    return { message: '비밀번호 재설정 인증 코드가 이메일로 전송되었습니다' };
  }

  /**
   * 비밀번호 재설정
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        passwordResetToken: code,
      },
    });

    if (!user) {
      throw new BadRequestException(
        '유효하지 않은 이메일 또는 인증 코드입니다',
      );
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException(
        '인증 코드가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요',
      );
    }

    // 새 비밀번호 해싱
    const hashedPassword = await this.hashPassword(newPassword);

    // 비밀번호 업데이트 및 재설정 토큰 삭제
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: '비밀번호가 성공적으로 재설정되었습니다' };
  }

  /**
   * 소셜 로그인 처리 (Google, Kakao 등)
   * 사용자가 없으면 자동으로 회원가입 후 로그인
   */
  async validateSocialUser(socialUser: {
    provider: string;
    providerId: string;
    email: string | null;
    name: string;
    profileImage?: string;
  }) {
    // 기존 사용자 확인 (provider + providerId 조합으로)
    let user = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: socialUser.provider as any,
          providerId: socialUser.providerId,
        },
      },
    });

    // 사용자가 없으면 자동 회원가입
    if (!user) {
      let profileImageKey: string | undefined;

      // 소셜 로그인 프로필 이미지가 있으면 R2에 저장
      if (socialUser.profileImage) {
        try {
          const result = await this.storageService.uploadImageFromUrl(
            socialUser.profileImage,
            'profiles',
            `${socialUser.provider}-${socialUser.providerId}`, // provider-providerId를 파일명으로 사용
          );
          profileImageKey = result.key;
          this.logger.log(
            `Social profile image uploaded to R2: ${profileImageKey}`,
          );
        } catch (error) {
          // 프로필 이미지 업로드 실패해도 회원가입은 진행
          this.logger.warn(
            `Failed to upload social profile image: ${error.message}`,
          );
        }
      }

      user = await this.prisma.user.create({
        data: {
          email: socialUser.email,
          name: socialUser.name,
          profileImageKey, // R2에 저장된 이미지 키
          provider: socialUser.provider as any,
          providerId: socialUser.providerId,
          isEmailVerified: true, // 소셜 로그인은 이메일 인증 불필요
          password: null, // 소셜 로그인은 비밀번호 없음
        },
      });
    } else if (!user.profileImageKey && socialUser.profileImage) {
      // 기존 사용자인데 profileImageKey가 없는 경우 (첫 로그인 시 자동 저장)
      try {
        const result = await this.storageService.uploadImageFromUrl(
          socialUser.profileImage,
          'profiles',
          `${socialUser.provider}-${socialUser.providerId}`,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { profileImageKey: result.key },
        });
        user.profileImageKey = result.key;
        this.logger.log(
          `Profile image saved to R2 on first login: ${result.key}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to save profile image to R2: ${error.message}`,
        );
      }
    }

    // 공통 로그인 처리 함수 호출
    return this.handleLoginSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageKey: user.profileImageKey,
      isAdmin: user.isAdmin,
      hasPassword: user.password !== null,
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
        createdAt: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
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
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 소셜 로그인 사용자이고 비밀번호가 설정되지 않은 경우
    if (!user.password && user.provider !== 'LOCAL') {
      throw new BadRequestException(
        '소셜 로그인 사용자는 먼저 비밀번호를 설정해야 프로필을 수정할 수 있습니다',
      );
    }

    // 현재 비밀번호 확인
    if (!user.password) {
      throw new BadRequestException('비밀번호가 설정되어 있지 않습니다');
    }

    const isPasswordValid = await this.verifyPassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');
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

    // 업데이트할 내용이 없는 경우
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('업데이트할 정보가 없습니다');
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
        createdAt: true,
      },
    });

    return {
      message: '프로필이 성공적으로 업데이트되었습니다',
      user: updatedUser,
    };
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
}
