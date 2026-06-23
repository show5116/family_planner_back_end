import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.apple.clientId'),
      teamID: configService.get<string>('oauth.apple.teamId'),
      keyID: configService.get<string>('oauth.apple.keyId'),
      privateKeyString: configService
        .get<string>('oauth.apple.privateKey')
        ?.replace(/\\n/g, '\n'),
      callbackURL: configService.get<string>('oauth.apple.callbackUrl'),
      scope: ['name', 'email'],
      passReqToCallback: false,
    } as any);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: (error: any, user?: any) => void,
  ): void {
    // Apple은 최초 로그인 시에만 name을 제공함
    const email = idToken?.email ?? null;
    const sub = idToken?.sub;
    const firstName = profile?.name?.firstName ?? '';
    const lastName = profile?.name?.lastName ?? '';
    const name =
      [lastName, firstName].filter(Boolean).join('') ||
      email?.split('@')[0] ||
      '사용자';

    done(null, {
      provider: 'APPLE',
      providerId: sub,
      email,
      name,
      profileImage: null,
    });
  }
}
