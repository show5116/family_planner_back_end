import { SubscriptionTier } from '@prisma/client';

/**
 * 스토어 상품 ID → 구독 티어 매핑
 * Google Play / App Store 모두 동일한 상품 ID를 사용한다.
 */
export const SUBSCRIPTION_PRODUCT_TIER_MAP: Record<string, SubscriptionTier> = {
  family_planner_ad_free_monthly: SubscriptionTier.ad_free,
  // 스토어 미등록 상태 (현재는 ADMIN 수동 부여 전용). 스토어 등록 시 그대로 동작한다.
  family_planner_premium_monthly: SubscriptionTier.premium,
};

/**
 * 상품 ID로 구독 티어 조회 (매핑되지 않은 상품이면 null)
 */
export function resolveTierByProductId(
  productId: string,
): SubscriptionTier | null {
  return SUBSCRIPTION_PRODUCT_TIER_MAP[productId] ?? null;
}
