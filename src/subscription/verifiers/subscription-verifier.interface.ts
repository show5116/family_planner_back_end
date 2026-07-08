import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';

export interface VerifiedPurchase {
  platform: SubscriptionPlatform;
  productId: string;
  originalTransactionId: string;
  latestTransactionId?: string;
  tier: SubscriptionTier;
  expiresAt: Date | null;
  autoRenewing: boolean;
  status: SubscriptionStatus;
}

export interface SubscriptionVerifier {
  verify(token: string): Promise<VerifiedPurchase>;
}

export const ANDROID_SUBSCRIPTION_VERIFIER = Symbol(
  'ANDROID_SUBSCRIPTION_VERIFIER',
);
export const IOS_SUBSCRIPTION_VERIFIER = Symbol('IOS_SUBSCRIPTION_VERIFIER');
