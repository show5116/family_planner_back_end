import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.google.clientId'),
      clientSecret: configService.get<string>('oauth.google.clientSecret'),
      callbackURL: configService.get<string>('oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): void {
    const { id, name, emails, photos } = profile;

    // 한국식 이름 형식: 성(familyName) + 이름(givenName)

    const fullName =
      name.familyName && name.givenName
        ? `${name.familyName}${name.givenName}`
        : name.givenName || name.familyName || emails[0].value.split('@')[0];

    const user = {
      provider: 'GOOGLE',
      providerId: id,
      email: emails[0].value,
      name: fullName,
      profileImage: photos[0]?.value,
    };

    done(null, user);
  }
}
