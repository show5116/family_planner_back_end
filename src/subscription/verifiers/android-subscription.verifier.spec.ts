import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { AndroidSubscriptionVerifier } from './android-subscription.verifier';

describe('AndroidSubscriptionVerifier', () => {
  let verifier: AndroidSubscriptionVerifier;
  let get: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'iap.android.packageName' ? 'com.hmncorp.familyplanner' : 'x',
    ),
  };

  /** 해지 상태의 정상 응답 (canceledStateContext만 케이스별로 갈아 끼운다) */
  const purchase = (canceledStateContext?: unknown) => ({
    subscriptionState: 'SUBSCRIPTION_STATE_CANCELED',
    latestOrderId: 'order-1',
    canceledStateContext,
    lineItems: [
      {
        productId: 'family_planner_ad_free_monthly',
        expiryTime: '2026-10-01T00:00:00.000Z',
        latestSuccessfulOrderId: 'order-1',
        autoRenewingPlan: { autoRenewEnabled: false },
      },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AndroidSubscriptionVerifier,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    verifier = module.get(AndroidSubscriptionVerifier);

    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) =>
      key === 'iap.android.packageName' ? 'com.hmncorp.familyplanner' : 'x',
    );

    get = jest.fn();
    jest
      .spyOn(verifier as never, 'getClient')
      .mockReturnValue({ purchases: { subscriptionsv2: { get } } } as never);
  });

  const verifyWith = async (canceledStateContext?: unknown) => {
    get.mockResolvedValue({ data: purchase(canceledStateContext) });
    return verifier.verify('token-1');
  };

  it('기본 필드를 매핑해야 함', async () => {
    const result = await verifyWith();

    expect(result).toMatchObject({
      tier: SubscriptionTier.ad_free,
      status: SubscriptionStatus.canceled,
      autoRenewing: false,
      originalTransactionId: 'token-1',
    });
  });

  it('해지 맥락이 없으면 cancellation을 채우지 않아야 함', async () => {
    const result = await verifyWith(undefined);

    expect(result.cancellation).toBeUndefined();
  });

  it('사용자 해지 + 설문 응답을 읽어야 함', async () => {
    const result = await verifyWith({
      userInitiatedCancellation: {
        cancelTime: '2026-09-10T12:00:00.000Z',
        cancelSurveyResult: {
          reason: 'CANCEL_SURVEY_REASON_COST_RELATED',
          reasonUserInput: '',
        },
      },
    });

    expect(result.cancellation).toEqual({
      initiator: 'USER',
      surveyReason: 'CANCEL_SURVEY_REASON_COST_RELATED',
      surveyUserInput: '',
      canceledAt: new Date('2026-09-10T12:00:00.000Z'),
    });
  });

  it('설문에 응답하지 않아도 사용자 해지로 남겨야 함', async () => {
    const result = await verifyWith({
      userInitiatedCancellation: { cancelTime: '2026-09-10T12:00:00.000Z' },
    });

    expect(result.cancellation).toMatchObject({ initiator: 'USER' });
    expect(result.cancellation?.surveyReason).toBeUndefined();
  });

  it('자유 입력은 500자로 잘라야 함', async () => {
    const result = await verifyWith({
      userInitiatedCancellation: {
        cancelSurveyResult: {
          reason: 'CANCEL_SURVEY_REASON_OTHERS',
          reasonUserInput: 'ㄱ'.repeat(900),
        },
      },
    });

    expect(result.cancellation?.surveyUserInput).toHaveLength(500);
  });

  it('교체(업그레이드)는 사용자 이탈로 세면 안 됨', async () => {
    const result = await verifyWith({ replacementCancellation: {} });

    expect(result.cancellation).toEqual({ initiator: 'REPLACEMENT' });
  });

  it('교체와 사용자 해지가 함께 와도 교체가 이겨야 함', async () => {
    const result = await verifyWith({
      replacementCancellation: {},
      userInitiatedCancellation: {
        cancelSurveyResult: { reason: 'CANCEL_SURVEY_REASON_OTHERS' },
      },
    });

    expect(result.cancellation).toEqual({ initiator: 'REPLACEMENT' });
  });

  it('결제 실패로 인한 시스템 해지는 SYSTEM으로 구분해야 함', async () => {
    const result = await verifyWith({ systemInitiatedCancellation: {} });

    expect(result.cancellation).toEqual({ initiator: 'SYSTEM' });
  });

  it('개발자 해지는 DEVELOPER로 구분해야 함', async () => {
    const result = await verifyWith({ developerInitiatedCancellation: {} });

    expect(result.cancellation).toEqual({ initiator: 'DEVELOPER' });
  });
});
