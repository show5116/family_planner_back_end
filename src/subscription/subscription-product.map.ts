import { SubscriptionTier } from '@prisma/client';

export const SUBSCRIPTION_PRODUCT_TIER_MAP: Record<string, SubscriptionTier> = {
  'com.family.adfree.monthly': SubscriptionTier.ad_free,
  'com.family.premium.monthly': SubscriptionTier.premium,
  'com.family.premium.yearly': SubscriptionTier.premium,
};

export function resolveTierByProductId(productId: string): SubscriptionTier {
  return SUBSCRIPTION_PRODUCT_TIER_MAP[productId] ?? SubscriptionTier.free;
}
