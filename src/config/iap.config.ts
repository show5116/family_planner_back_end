import { registerAs } from '@nestjs/config';

export default registerAs('iap', () => ({
  android: {
    packageName: process.env.ANDROID_PACKAGE_NAME || '',
    serviceAccountEmail: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL || '',
    serviceAccountPrivateKey:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
        /\\n/g,
        '\n',
      ) || '',
  },
  ios: {
    bundleId: process.env.IOS_BUNDLE_ID || '',
    // App Store Connect의 숫자 앱 ID (Production 서명 검증에 필수)
    appAppleId: process.env.APPLE_APP_APPLE_ID
      ? Number(process.env.APPLE_APP_APPLE_ID)
      : undefined,
    issuerId: process.env.APPLE_IAP_ISSUER_ID || '',
    keyId: process.env.APPLE_IAP_KEY_ID || '',
    privateKey: process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    // 우선 조회할 환경. 실패 시 나머지 환경도 자동으로 시도한다.
    environment: process.env.APPLE_IAP_ENVIRONMENT || 'Production',
  },
}));
