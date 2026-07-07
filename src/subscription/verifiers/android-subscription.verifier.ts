import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { SubscriptionPlatform, SubscriptionStatus } from '@prisma/client';
import { resolveTierByProductId } from '../subscription-product.map';
import {
  SubscriptionVerifier,
  VerifiedPurchase,
} from './subscription-verifier.interface';

const GOOGLE_STATE_TO_STATUS: Record<string, SubscriptionStatus> = {
  SUBSCRIPTION_STATE_ACTIVE: SubscriptionStatus.active,
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: SubscriptionStatus.grace_period,
  SUBSCRIPTION_STATE_CANCELED: SubscriptionStatus.canceled,
  SUBSCRIPTION_STATE_EXPIRED: SubscriptionStatus.expired,
  SUBSCRIPTION_STATE_ON_HOLD: SubscriptionStatus.grace_period,
  SUBSCRIPTION_STATE_PAUSED: SubscriptionStatus.canceled,
  SUBSCRIPTION_STATE_REVOKED: SubscriptionStatus.revoked,
};

@Injectable()
export class AndroidSubscriptionVerifier implements SubscriptionVerifier {
  private readonly logger = new Logger(AndroidSubscriptionVerifier.name);

  constructor(private readonly configService: ConfigService) {}

  async verify(purchaseToken: string): Promise<VerifiedPurchase> {
    const packageName = this.configService.get<string>(
      'iap.android.packageName',
    );
    const clientEmail = this.configService.get<string>(
      'iap.android.serviceAccountEmail',
    );
    const privateKey = this.configService.get<string>(
      'iap.android.serviceAccountPrivateKey',
    );

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    let response;
    try {
      response = await androidPublisher.purchases.subscriptionsv2.get({
        packageName,
        token: purchaseToken,
      });
    } catch (error) {
      this.logger.warn(`Android 구독 검증 실패: ${error.message}`);
      throw new UnprocessableEntityException(
        'subscription.errors.verification_failed',
      );
    }

    const data = response.data;
    const lineItem = data.lineItems?.[0];
    if (!lineItem) {
      throw new UnprocessableEntityException(
        'subscription.errors.verification_failed',
      );
    }

    const status =
      GOOGLE_STATE_TO_STATUS[data.subscriptionState ?? ''] ??
      SubscriptionStatus.expired;

    return {
      platform: SubscriptionPlatform.ANDROID,
      productId: lineItem.productId,
      originalTransactionId: purchaseToken,
      tier: resolveTierByProductId(lineItem.productId),
      expiresAt: lineItem.expiryTime ? new Date(lineItem.expiryTime) : null,
      autoRenewing: !!lineItem.autoRenewingPlan?.autoRenewEnabled,
      status,
    };
  }
}
