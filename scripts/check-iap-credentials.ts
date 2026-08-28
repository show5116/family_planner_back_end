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
  SendAttemptResult,
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
  const packageName = process.env.ANDROID_PACKAGE_NAME;

  // 1) 앱 접근 권한 확인 (구매 토큰 불필요)
  let productIds: string[] = [];
  try {
    const { data } = await publisher.monetization.subscriptions.list({
      packageName,
    });
    productIds = (data.subscriptions ?? []).map((sub) => sub.productId);
    record(
      'Google Play — 앱 접근',
      'OK',
      `구독 상품 ${productIds.length}건 조회: ${productIds.join(', ') || '(등록된 상품 없음)'}`,
    );
  } catch (error) {
    const status = error?.response?.status ?? error?.code;
    const message = error?.response?.data?.error?.message ?? error.message;

    if (
      status === 403 &&
      /has not been used in project|is disabled/.test(String(message))
    ) {
      record(
        'Google Play — 앱 접근',
        'FAIL',
        'Google Play Android Developer API가 사용 설정되지 않았습니다\n' +
          '   → Cloud Console > API 라이브러리에서 androidpublisher API 사용 설정',
      );
    } else if (status === 404) {
      record(
        'Google Play — 앱 접근',
        'FAIL',
        `Play Console에 ${packageName} 앱이 없습니다 (AAB 업로드 필요)`,
      );
    } else {
      record(
        'Google Play — 앱 접근',
        'FAIL',
        `서비스 계정에 앱 권한이 없습니다 (status=${status})\n` +
          '   → Play Console > 사용자 및 권한에서 해당 앱 권한 부여',
      );
    }
    return;
  }

  // 2) 재무 데이터 권한 확인
  //    purchases 계열은 구매 토큰이 없어도 권한만으로 판별 가능한 voidedpurchases로 검사한다.
  //    (가짜 토큰으로 검사하면 "권한 없음"과 "토큰 없음"이 모두 401이라 구분되지 않는다)
  try {
    await publisher.purchases.voidedpurchases.list({
      packageName,
      maxResults: 1,
    });
    record(
      'Google Play — 재무 데이터 권한',
      'OK',
      '구매·환불 조회 권한 정상 (영수증 검증 가능)',
    );
  } catch (error) {
    const status = error?.response?.status ?? error?.code;
    record(
      'Google Play — 재무 데이터 권한',
      'FAIL',
      `구매 조회 권한이 없습니다 (status=${status})\n` +
        '   앱 권한은 정상이므로 아래 권한만 누락된 상태입니다:\n' +
        '   → "재무 데이터, 주문, 구독 취소 설문 응답 보기" (반영까지 최대 24시간)',
    );
  }

  // 3) 상품 ID가 서버 매핑과 일치하는지 확인
  if (productIds.length > 0) {
    const { SUBSCRIPTION_PRODUCT_TIER_MAP } = await import(
      '@/subscription/subscription-product.map'
    );
    const unmapped = productIds.filter(
      (id) => !(id in SUBSCRIPTION_PRODUCT_TIER_MAP),
    );
    record(
      '상품 ID 매핑',
      unmapped.length === 0 ? 'OK' : 'FAIL',
      unmapped.length === 0
        ? '스토어 상품이 모두 서버 tier 매핑에 존재합니다'
        : `매핑되지 않은 상품: ${unmapped.join(', ')}\n   → subscription-product.map.ts에 추가 필요`,
    );
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

/**
 * Apple에게 테스트 알림 발송을 요청하고 전달 결과를 확인한다.
 * App Store Connect에 등록한 웹훅 URL이 실제로 동작하는지 검증한다.
 */
async function sendTestNotification(environment: Environment) {
  const label = `웹훅 테스트 알림 (${environment})`;

  const client = new AppStoreServerAPIClient(
    process.env.APPLE_IAP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    process.env.APPLE_IAP_KEY_ID,
    process.env.APPLE_IAP_ISSUER_ID,
    process.env.IOS_BUNDLE_ID,
    environment,
  );

  let token: string;
  try {
    const response = await client.requestTestNotification();
    token = response.testNotificationToken;
    console.log(`   발송 요청 완료 (token=${token?.slice(0, 20)}...)`);
  } catch (error) {
    record(
      label,
      'FAIL',
      `발송 요청 실패: ${error instanceof APIException ? `status=${error.httpStatusCode} apiError=${error.apiError}` : error.message}`,
    );
    return;
  }

  // Apple이 전송을 시도하고 결과를 기록할 때까지 대기
  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const status = await client.getTestNotificationStatus(token);
      const first = status.sendAttempts?.[0];

      if (!first) continue;

      const result = first.sendAttemptResult as SendAttemptResult;
      if (result === SendAttemptResult.SUCCESS) {
        record(label, 'OK', '서버가 알림을 정상 수신하고 2xx를 반환했습니다');
      } else {
        record(
          label,
          'FAIL',
          `전달 실패: ${result}\n` +
            '   → URL 오타(/v1 누락 등), 서버 응답 코드, TLS 설정을 확인하세요',
        );
      }
      return;
    } catch {
      // 아직 결과가 준비되지 않음 — 재시도
    }
  }

  record(
    label,
    'FAIL',
    '결과 조회 시간 초과 (Apple이 아직 전송 결과를 기록하지 않음)',
  );
}

async function main() {
  console.log('\n인앱 구독 스토어 자격증명 점검\n');

  await checkGoogle();
  await checkApple();

  if (process.argv.includes('--test-notification')) {
    const target = process.argv.includes('--production')
      ? Environment.PRODUCTION
      : Environment.SANDBOX;
    await sendTestNotification(target);
  }

  const failed = results.filter((r) => r.result === 'FAIL').length;
  const skipped = results.filter((r) => r.result === 'SKIP').length;

  console.log('─'.repeat(60));
  console.log(
    `결과: 정상 ${results.length - failed - skipped}건 / 실패 ${failed}건 / 건너뜀 ${skipped}건`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

void main();
