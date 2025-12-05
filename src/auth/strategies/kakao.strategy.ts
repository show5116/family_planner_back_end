import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('oauth.kakao.clientId'),
      clientSecret: configService.get<string>('oauth.kakao.clientSecret'),
      callbackURL: configService.get<string>('oauth.kakao.callbackUrl'),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, _json } = profile;

    const user = {
      provider: 'KAKAO',
      providerId: id.toString(),
      email: _json.kakao_account?.email || null,
      name: _json.kakao_account?.profile?.nickname || username,
      profileImage: _json.kakao_account?.profile?.profile_image_url,
    };

    done(null, user);
  }
}
