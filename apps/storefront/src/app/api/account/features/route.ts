export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isFeatureEnabled, getTenantConfig } from '@/lib/tenant'

import type { PortalFeatureFlags } from '@/lib/account/types'

/**
 * GET /api/account/features
 * Returns enabled portal features for the current tenant
 */
export async function GET() {
  const tenantConfig = await getTenantConfig()

  if (!tenantConfig) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check each feature flag
  const [
    ordersEnabled,
    orderCancellationEnabled,
    orderReturnsEnabled,
    wishlistEnabled,
    wishlistSharingEnabled,
    referralsEnabled,
    loyaltyEnabled,
    supportTicketsEnabled,
    liveChatEnabled,
    faqEnabled,
  ] = await Promise.all([
    isFeatureEnabled('portal.orders'),
    isFeatureEnabled('portal.order_cancellation'),
    isFeatureEnabled('portal.order_returns'),
    isFeatureEnabled('portal.wishlist'),
    isFeatureEnabled('portal.wishlist_sharing'),
    isFeatureEnabled('portal.referrals'),
    isFeatureEnabled('portal.loyalty'),
    isFeatureEnabled('portal.support_tickets'),
    isFeatureEnabled('portal.live_chat'),
    isFeatureEnabled('portal.faq'),
  ])

  const features: PortalFeatureFlags = {
    // Default most features to true since they're core functionality
    ordersEnabled: ordersEnabled !== false,
    orderCancellationEnabled: orderCancellationEnabled !== false,
    orderReturnsEnabled: orderReturnsEnabled !== false,
    wishlistEnabled: wishlistEnabled !== false,
    wishlistSharingEnabled,
    referralsEnabled,
    loyaltyEnabled,
    supportTicketsEnabled,
    liveChatEnabled,
    faqEnabled,
  }

  return NextResponse.json(features)
}
