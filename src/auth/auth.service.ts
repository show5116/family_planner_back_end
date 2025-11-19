import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

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
    const hashedPassword = await bcrypt.hash(password, 10);

    // 이메일 인증 토큰 생성 (24시간 유효)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'LOCAL',
        emailVerificationToken: verificationToken,
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
      await this.emailService.sendVerificationEmail(email, verificationToken, name);
    } catch (error) {
      // 이메일 전송 실패 시 사용자에게 알림 (하지만 회원가입은 완료)
      return {
        message: '회원가입이 완료되었지만, 인증 이메일 전송에 실패했습니다. 인증 이메일 재전송을 요청해주세요.',
        user,
      };
    }

    return {
      message: '회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.',
      user,
    };
  }

  /**
   * 로그인
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // LOCAL 로그인이 아닌 경우
    if (user.provider !== 'LOCAL') {
      throw new UnauthorizedException(
        `이 계정은 ${user.provider} 로그인을 사용합니다`,
      );
    }

    // 비밀번호 확인
    if (!user.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // 이메일 인증 확인 (LOCAL 로그인만)
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('이메일 인증이 필요합니다. 이메일을 확인해주세요');
    }

    // 토큰 생성
    const tokens = await this.generateTokens(user.id);

    // Refresh Token 저장 (RTR)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Refresh Token으로 새로운 Access Token 발급 (RTR)
   */
  async refresh(refreshToken: string) {
    // Refresh Token 검증
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다');
    }

    // 토큰이 무효화되었는지 확인
    if (storedToken.isRevoked) {
      throw new UnauthorizedException('이미 무효화된 Refresh Token입니다');
    }

    // 만료 확인
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('만료된 Refresh Token입니다');
    }

    // 기존 토큰 무효화 (RTR)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // 새로운 토큰 생성
    const tokens = await this.generateTokens(storedToken.userId);

    // 새로운 Refresh Token 저장
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.userId,
        expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Access Token과 Refresh Token 생성
   */
  private async generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    const accessExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
    const refreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

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
   * 이메일 인증
   */
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('유효하지 않은 인증 토큰입니다');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('이미 인증된 이메일입니다');
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('인증 토큰이 만료되었습니다. 인증 이메일을 재전송해주세요');
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
      throw new BadRequestException('소셜 로그인 사용자는 이메일 인증이 필요하지 않습니다');
    }

    // 새로운 인증 토큰 생성
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // 이메일 발송
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken, user.name);
    } catch (error) {
      throw new BadRequestException('이메일 전송에 실패했습니다');
    }

    return { message: '인증 이메일이 재전송되었습니다' };
  }

  /**
   * 로그아웃 (Refresh Token 무효화)
   */
  async logout(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new NotFoundException('Refresh Token을 찾을 수 없습니다');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return { message: '로그아웃되었습니다' };
  }
}
