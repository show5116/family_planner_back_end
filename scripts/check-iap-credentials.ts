/**
 * 인앱 구독(IAP) 스토어 자격증명 점검 스크립트
 * 실행: npm run check:iap
 *
 * 실제 구매 없이 스토어 API 인증·권한만 확인한다.
 * 존재하지 않는 토큰으로 조회해 "인증은 통과했는데 거래만 없음" 응답이 오면 정상이다.
 */

import 'dotenv/config';
import { google } from 'googleapis';
import {
  AppStoreServerAPIClient,
  APIException,
  Environment,
} from '@apple/app-store-server-library';

type Result = 'OK' | 'FAIL' | 'SKIP';

const results: { name: string; result: Result; detail: string }[] = [];

function record(name: string, result: Result, detail: string) {
  results.push({ name, result, detail });
  const mark = result === 'OK' ? '✅' : result === 'SKIP' ? '⏭️ ' : '❌';
  console.log(`${mark} ${name}`);
  console.log(`   ${detail}\n`);
}

function missingEnv(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

/**
 * Google Play Developer API 점검
 */
async function checkGoogle() {
  const required = [
    'ANDROID_PACKAGE_NAME',
    'GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY',
  ];
  const missing = missingEnv(required);
  if (missing.length > 0) {
    record('Google Play', 'SKIP', `환경변수 누락: ${missing.join(', ')}`);
    return;
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
      /\\n/g,
      '\n',
    ),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  try {
    await auth.authorize();
  } catch (error) {
    record(
      'Google Play',
      'FAIL',
      `액세스 토큰 발급 실패 — 서비스 계정 이메일/개인키를 확인하세요\n   ${error.message}`,
    );
    return;
  }

  const publisher = google.androidpublisher({ version: 'v3', auth });

  try {
    await publisher.purchases.subscriptionsv2.get({
      packageName: process.env.ANDROID_PACKAGE_NAME,
      token: 'invalid-token-for-credential-check',
    });
    record('Google Play', 'OK', '인증·권한 정상 (조회까지 성공)');
  } catch (error) {
    const status = error?.response?.status ?? error?.code;
    const message = error?.response?.data?.error?.message ?? error.message;

    if (status === 400 || status === 404 || status === 410) {
      record(
        'Google Play',
        'OK',
        `인증·권한 정상 (status=${status}, 토큰만 무효한 예상된 응답)`,
      );
    } else if (
      status === 403 &&
      /has not been used in project|is disabled/.test(String(message))
    ) {
      record(
        'Google Play',
        'FAIL',
        'Google Play Android Developer API가 사용 설정되지 않았습니다\n' +
          '   → Cloud Console > API 라이브러리에서 androidpublisher API 사용 설정',
      );
    } else if (status === 401 || status === 403) {
      record(
        'Google Play',
        'FAIL',
        `서비스 계정 권한 부족 (status=${status})\n` +
          '   → Play Console > 사용자 및 권한에서 해당 서비스 계정에\n' +
          '     "재무 데이터, 주문, 구독 취소 설문 응답 보기" 권한 부여 (반영까지 최대 24시간)',
      );
    } else {
      record('Google Play', 'FAIL', `status=${status} / ${message}`);
    }
  }
}

/**
 * App Store Server API 점검 (Sandbox·Production 각각)
 */
async function checkApple() {
  const required = [
    'IOS_BUNDLE_ID',
    'APPLE_IAP_ISSUER_ID',
    'APPLE_IAP_KEY_ID',
    'APPLE_IAP_PRIVATE_KEY',
  ];
  const missing = missingEnv(required);
  if (missing.length > 0) {
    record('App Store', 'SKIP', `환경변수 누락: ${missing.join(', ')}`);
    return;
  }

  if (!process.env.APPLE_APP_APPLE_ID) {
    record(
      'App Store (Production 서명 검증)',
      'FAIL',
      'APPLE_APP_APPLE_ID가 없어 Production 영수증 검증이 불가능합니다',
    );
  }

  for (const environment of [Environment.SANDBOX, Environment.PRODUCTION]) {
    const client = new AppStoreServerAPIClient(
      process.env.APPLE_IAP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      process.env.APPLE_IAP_KEY_ID,
      process.env.APPLE_IAP_ISSUER_ID,
      process.env.IOS_BUNDLE_ID,
      environment,
    );

    try {
      await client.getAllSubscriptionStatuses('000000000000000');
      record(`App Store (${environment})`, 'OK', '인증·권한 정상');
    } catch (error) {
      if (!(error instanceof APIException)) {
        record(`App Store (${environment})`, 'FAIL', error.message);
        continue;
      }

      // 4000006 INVALID_TRANSACTION_ID / 404 NOT_FOUND = 인증은 통과한 상태
      if (error.httpStatusCode === 400 || error.httpStatusCode === 404) {
        record(
          `App Store (${environment})`,
          'OK',
          `인증 정상 (status=${error.httpStatusCode}, apiError=${error.apiError} — 거래 ID만 무효한 예상된 응답)`,
        );
      } else if (error.httpStatusCode === 401) {
        record(
          `App Store (${environment})`,
          'FAIL',
          '인증 실패 (401) — Issuer ID / Key ID / .p8 키를 확인하세요\n' +
            '   Issuer ID는 Team ID가 아니라 App Store Connect의 UUID입니다',
        );
      } else {
        record(
          `App Store (${environment})`,
          'FAIL',
          `status=${error.httpStatusCode} apiError=${error.apiError}`,
        );
      }
    }
  }
}

async function main() {
  console.log('\n인앱 구독 스토어 자격증명 점검\n');

  await checkGoogle();
  await checkApple();

  const failed = results.filter((r) => r.result === 'FAIL').length;
  const skipped = results.filter((r) => r.result === 'SKIP').length;

  console.log('─'.repeat(60));
  console.log(
    `결과: 정상 ${results.length - failed - skipped}건 / 실패 ${failed}건 / 건너뜀 ${skipped}건`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

void main();
