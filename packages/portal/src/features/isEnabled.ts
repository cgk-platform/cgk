/**
 * Feature Flag Checks
 *
 * Check if portal features are enabled for a tenant.
 */

import { sql } from '@cgk/db'
import type { PortalFeatureFlags } from '../types'

/**
 * Default feature flag values
 */
const DEFAULT_FEATURES: PortalFeatureFlags = {
  orders: true,
  subscriptions: true,
  addresses: true,
  profile: true,
  store_credit: false,
  rewards: false,
  referrals: false,
  subscription_pause: true,
  subscription_skip: true,
  subscription_cancel_self_serve: false,
  subscription_reschedule: true,
  subscription_payment_update: true,
  subscription_address_update: true,
  subscription_frequency_update: false,
  subscription_product_swap: false,
}

/**
 * Cache for feature flags
 */
const featureCache = new Map<string, PortalFeatureFlags>()
const cacheExpiry = new Map<string, number>()
const CACHE_TTL = 60 * 1000 // 1 minute

/**
 * Get all portal feature flags for a tenant
 */
export async function getPortalFeatures(tenantId: string): Promise<PortalFeatureFlags> {
  const now = Date.now()
  const expiry = cacheExpiry.get(tenantId)

  if (expiry && expiry > now) {
    const cached = featureCache.get(tenantId)
    if (cached) {
      return cached
    }
  }

  try {
    // Query feature flags from database
    const result = await sql<{ key: string; value: boolean }>`
      SELECT
        ff.key,
        COALESCE(
          (
            SELECT value::boolean
            FROM public.feature_flag_overrides ffo
            WHERE ffo.flag_key = ff.key
              AND ffo.tenant_id = ${tenantId}
              AND (ffo.expires_at IS NULL OR ffo.expires_at > NOW())
            LIMIT 1
          ),
          ff.default_value::boolean
        ) as value
      FROM public.feature_flags ff
      WHERE ff.key LIKE 'portal.%'
        AND ff.status = 'active'
    `

    // Start with defaults
    const features = { ...DEFAULT_FEATURES }

    // Apply overrides from database
    for (const row of result.rows) {
      // Convert 'portal.subscription_pause' to 'subscription_pause'
      const key = row.key.replace('portal.', '') as keyof PortalFeatureFlags
      if (key in features) {
        features[key] = row.value
      }
    }

    featureCache.set(tenantId, features)
    cacheExpiry.set(tenantId, now + CACHE_TTL)

    return features
  } catch (error) {
    console.warn('Failed to load feature flags:', error)
    return DEFAULT_FEATURES
  }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  tenantId: string,
  feature: keyof PortalFeatureFlags
): Promise<boolean> {
  const features = await getPortalFeatures(tenantId)
  return features[feature]
}

/**
 * Clear feature cache for a tenant
 */
export function clearFeatureCache(tenantId: string): void {
  featureCache.delete(tenantId)
  cacheExpiry.delete(tenantId)
}

/**
 * Clear all feature caches
 */
export function clearAllFeatureCaches(): void {
  featureCache.clear()
  cacheExpiry.clear()
}
