import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { GoogleStrategy } from '@/auth/strategies/google.strategy';
import { KakaoStrategy } from '@/auth/strategies/kakao.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/email/email.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    StorageModule,
    PassportModule,
    JwtModule.register({}), // 동적으로 secret을 설정하므로 빈 객체로 등록
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    KakaoStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
