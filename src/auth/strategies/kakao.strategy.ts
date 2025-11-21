import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '', // Kakao는 선택적
      callbackURL: process.env.KAKAO_CALLBACK_URL || 'http://localhost:3000/auth/kakao/callback',
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
