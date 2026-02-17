/**
 * Feature Flag Enforcement Layer
 *
 * Provides middleware helpers for enforcing feature flags in API routes.
 * Wraps @cgk-platform/feature-flags with auth-aware context extraction.
 */

import { sql } from '@cgk-platform/db'

/**
 * Check if a feature is enabled for a tenant
 *
 * Checks tenant settings first (for simple feature toggles), then falls back
 * to the full feature flag system for complex flags.
 *
 * @example
 * ```ts
 * if (await isFeatureEnabled(tenantId, 'creators')) {
 *   // Feature is enabled for this tenant
 * }
 * ```
 */
export async function isFeatureEnabled(
  tenantId: string,
  feature: string
): Promise<boolean> {
  // First check organization settings for simple feature toggles
  const result = await sql`
    SELECT settings->'features'->${feature} as enabled
    FROM public.organizations
    WHERE id = ${tenantId} OR slug = ${tenantId}
  `

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (row?.enabled !== undefined) {
    return row.enabled === true
  }

  // If not in org settings, return false
  // Complex flag configurations should be managed via organization settings
  // or by directly using @cgk-platform/feature-flags in the calling code
  return false
}

/**
 * Require a feature to be enabled, throwing if not
 *
 * @example
 * ```ts
 * await requireFeature(tenantId, 'creators')
 * // Throws if feature is not enabled
 * ```
 */
export async function requireFeature(
  tenantId: string,
  feature: string
): Promise<void> {
  const enabled = await isFeatureEnabled(tenantId, feature)
  if (!enabled) {
    throw new FeatureNotEnabledError(feature, tenantId)
  }
}

/**
 * Middleware helper for checking feature flags in API routes
 *
 * Returns a Response if the feature is not enabled, null otherwise.
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   const { tenantId } = await getTenantContext(request)
 *
 *   const featureDenied = await checkFeatureOrRespond(tenantId, 'creators')
 *   if (featureDenied) return featureDenied
 *
 *   // Continue with feature logic...
 * }
 * ```
 */
export async function checkFeatureOrRespond(
  tenantId: string,
  feature: string
): Promise<Response | null> {
  const enabled = await isFeatureEnabled(tenantId, feature)
  if (!enabled) {
    return new Response(
      JSON.stringify({
        error: `Feature '${feature}' is not enabled for this tenant`,
        code: 'FEATURE_NOT_ENABLED',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return null
}

/**
 * Higher-order function to wrap an API handler with feature flag check
 *
 * @example
 * ```ts
 * export const POST = withFeatureFlag('creators', async (request, context) => {
 *   // Handler only runs if feature is enabled
 *   return Response.json({ success: true })
 * })
 * ```
 */
export function withFeatureFlag<T extends unknown[]>(
  feature: string,
  handler: (request: Request, ...args: T) => Promise<Response>
): (request: Request, ...args: T) => Promise<Response> {
  return async (request: Request, ...args: T): Promise<Response> => {
    // Extract tenant from request headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    const tenantSlug = request.headers.get('x-tenant-slug')

    const tenant = tenantId || tenantSlug
    if (!tenant) {
      return new Response(
        JSON.stringify({
          error: 'Tenant context required',
          code: 'TENANT_REQUIRED',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const featureDenied = await checkFeatureOrRespond(tenant, feature)
    if (featureDenied) return featureDenied

    return handler(request, ...args)
  }
}

/**
 * Get all enabled features for a tenant
 *
 * @example
 * ```ts
 * const features = await getTenantFeatures(tenantId)
 * // { creators: true, contractors: false, esign: true, ... }
 * ```
 */
export async function getTenantFeatures(
  tenantId: string
): Promise<Record<string, boolean>> {
  const result = await sql`
    SELECT settings->'features' as features
    FROM public.organizations
    WHERE id = ${tenantId} OR slug = ${tenantId}
  `

  const row = result.rows[0] as Record<string, unknown> | undefined
  const features = (row?.features as Record<string, boolean>) || {}

  return features
}

/**
 * Set a feature flag for a tenant
 *
 * @example
 * ```ts
 * await setTenantFeature(tenantId, 'creators', true)
 * ```
 */
export async function setTenantFeature(
  tenantId: string,
  feature: string,
  enabled: boolean
): Promise<void> {
  await sql`
    UPDATE public.organizations
    SET settings = jsonb_set(
      COALESCE(settings, '{}'),
      ARRAY['features', ${feature}],
      ${enabled}::jsonb
    ),
    updated_at = NOW()
    WHERE id = ${tenantId} OR slug = ${tenantId}
  `
}

/**
 * Error thrown when a required feature is not enabled
 */
export class FeatureNotEnabledError extends Error {
  public readonly feature: string
  public readonly tenantId: string
  public readonly code = 'FEATURE_NOT_ENABLED'

  constructor(feature: string, tenantId: string) {
    super(`Feature '${feature}' is not enabled for tenant '${tenantId}'`)
    this.name = 'FeatureNotEnabledError'
    this.feature = feature
    this.tenantId = tenantId
  }
}
