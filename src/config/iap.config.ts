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
    issuerId: process.env.APPLE_IAP_ISSUER_ID || '',
    keyId: process.env.APPLE_IAP_KEY_ID || '',
    privateKey: process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    environment: process.env.APPLE_IAP_ENVIRONMENT || 'Production',
  },
}));
