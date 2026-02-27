/**
 * Shopify App - Tenant Resolution
 *
 * Maps Shopify shop domains to CGK tenant IDs.
 * Used by the embedded Shopify app to identify which tenant
 * the current shop belongs to.
 *
 * This enables TRUE multi-tenancy: one CGK Platform Shopify app
 * can serve ALL tenants (not one app per tenant).
 *
 * Flow:
 * 1. Shop installs CGK Platform app → OAuth flow
 * 2. OAuth callback creates entry in public.shopify_app_installations
 * 3. Webhook arrives → extract shop from headers
 * 4. Call getOrganizationIdForShop(shop) → get tenant ID
 * 5. Query tenant-specific data from tenant schema
 */

import { sql } from '@cgk-platform/db'

// ============================================================================
// Types
// ============================================================================

export interface ShopInstallation {
  id: string
  shop: string
  organizationId: string
  status: 'active' | 'uninstalled' | 'suspended'
  scopes: string[]
  installedAt: Date
  uninstalledAt: Date | null
}

export interface RecordInstallationParams {
  shop: string
  organizationId: string
  scopes: string[]
  shopifyAppId?: string | null
  primaryContactEmail?: string | null
}

// ============================================================================
// Tenant Resolution (Primary Function)
// ============================================================================

/**
 * Resolves a Shopify shop domain to a CGK tenant ID.
 *
 * This is the CORE function for multi-tenant routing.
 * Used by:
 * - Webhook handlers (to determine which tenant's data to update)
 * - Remix app routes (to load tenant-specific data)
 * - OAuth callback (to verify shop ownership)
 *
 * @param shop - Shopify shop domain (e.g., "meliusly.myshopify.com")
 * @returns Tenant ID (organization UUID) or null if not found
 *
 * @example
 * const tenantId = await getOrganizationIdForShop('meliusly.myshopify.com')
 * if (!tenantId) {
 *   throw new Error('Shop not registered with a tenant')
 * }
 * await withTenant(tenantId, async () => {
 *   // Query tenant data
 * })
 */
export async function getOrganizationIdForShop(shop: string): Promise<string | null> {
  const result = await sql`
    SELECT organization_id
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
      AND status = 'active'
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return row ? (row.organization_id as string) : null
}

// ============================================================================
// Installation Management
// ============================================================================

/**
 * Records a shop installation in the public schema.
 *
 * Called during OAuth callback after successful token exchange.
 * Creates or updates the public.shopify_app_installations record
 * to enable tenant resolution.
 *
 * @param params - Installation parameters
 *
 * @example
 * // In OAuth callback after token exchange:
 * await recordShopInstallation({
 *   shop: 'meliusly.myshopify.com',
 *   organizationId: '5cb87b13-3b13-4400-9542-53c8b8d12cb8',
 *   scopes: ['read_products', 'write_products', 'read_orders'],
 *   shopifyAppId: 'app_123',
 * })
 */
export async function recordShopInstallation(params: RecordInstallationParams): Promise<void> {
  await sql`
    INSERT INTO public.shopify_app_installations (
      shop,
      organization_id,
      scopes,
      shopify_app_id,
      primary_contact_email,
      status,
      installed_at
    ) VALUES (
      ${params.shop},
      ${params.organizationId},
      ${params.scopes},
      ${params.shopifyAppId || null},
      ${params.primaryContactEmail || null},
      'active',
      NOW()
    )
    ON CONFLICT (shop)
    DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      scopes = EXCLUDED.scopes,
      shopify_app_id = EXCLUDED.shopify_app_id,
      primary_contact_email = EXCLUDED.primary_contact_email,
      status = 'active',
      installed_at = NOW(),
      uninstalled_at = NULL,
      updated_at = NOW()
  `
}

/**
 * Marks a shop as uninstalled.
 *
 * Called when app/uninstalled webhook is received.
 * Updates status to 'uninstalled' and sets uninstalled_at timestamp.
 *
 * @param shop - Shopify shop domain
 *
 * @example
 * // In app/uninstalled webhook handler:
 * await recordShopUninstallation('meliusly.myshopify.com')
 */
export async function recordShopUninstallation(shop: string): Promise<void> {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'uninstalled',
      uninstalled_at = NOW(),
      updated_at = NOW()
    WHERE shop = ${shop}
  `
}

/**
 * Reactivates a shop installation (e.g., after reinstall).
 *
 * @param shop - Shopify shop domain
 */
export async function reactivateShopInstallation(shop: string): Promise<void> {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'active',
      installed_at = NOW(),
      uninstalled_at = NULL,
      updated_at = NOW()
    WHERE shop = ${shop}
  `
}

/**
 * Suspends a shop installation (manual platform admin action).
 *
 * @param shop - Shopify shop domain
 */
export async function suspendShopInstallation(shop: string): Promise<void> {
  await sql`
    UPDATE public.shopify_app_installations
    SET
      status = 'suspended',
      updated_at = NOW()
    WHERE shop = ${shop}
  `
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get installation details for a shop.
 *
 * @param shop - Shopify shop domain
 * @returns Installation record or null if not found
 */
export async function getShopInstallation(shop: string): Promise<ShopInstallation | null> {
  const result = await sql`
    SELECT
      id,
      shop,
      organization_id as "organizationId",
      status,
      scopes,
      installed_at as "installedAt",
      uninstalled_at as "uninstalledAt"
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
    LIMIT 1
  `

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  if (!row) {
    return null
  }

  return {
    id: row.id as string,
    shop: row.shop as string,
    organizationId: row.organizationId as string,
    status: row.status as 'active' | 'uninstalled' | 'suspended',
    scopes: (row.scopes as string[]) || [],
    installedAt: new Date(row.installedAt as string),
    uninstalledAt: row.uninstalledAt ? new Date(row.uninstalledAt as string) : null,
  }
}

/**
 * Get all active installations for an organization.
 *
 * @param organizationId - Organization UUID
 * @returns Array of shop domains
 */
export async function getOrganizationShops(organizationId: string): Promise<string[]> {
  const result = await sql`
    SELECT shop
    FROM public.shopify_app_installations
    WHERE organization_id = ${organizationId}
      AND status = 'active'
    ORDER BY installed_at DESC
  `

  return result.rows.map((row) => row.shop as string)
}

/**
 * Check if a shop is installed and active.
 *
 * @param shop - Shopify shop domain
 * @returns True if shop is active
 */
export async function isShopActive(shop: string): Promise<boolean> {
  const result = await sql`
    SELECT 1
    FROM public.shopify_app_installations
    WHERE shop = ${shop}
      AND status = 'active'
    LIMIT 1
  `

  return result.rows.length > 0
}

// ============================================================================
// Admin Utilities
// ============================================================================

/**
 * List all shop installations (for platform admin dashboard).
 *
 * @param filters - Optional filters
 * @returns Array of installations with organization names
 */
export async function listAllInstallations(filters?: {
  status?: 'active' | 'uninstalled' | 'suspended'
  organizationId?: string
  limit?: number
  offset?: number
}): Promise<Array<ShopInstallation & { organizationName: string; organizationSlug: string }>> {
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  let query = `
    SELECT
      sai.id,
      sai.shop,
      sai.organization_id as "organizationId",
      sai.status,
      sai.scopes,
      sai.installed_at as "installedAt",
      sai.uninstalled_at as "uninstalledAt",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    FROM public.shopify_app_installations sai
    JOIN public.organizations o ON sai.organization_id = o.id
    WHERE 1=1
  `

  const params: unknown[] = []
  let paramIndex = 1

  if (filters?.status) {
    query += ` AND sai.status = $${paramIndex}`
    params.push(filters.status)
    paramIndex++
  }

  if (filters?.organizationId) {
    query += ` AND sai.organization_id = $${paramIndex}`
    params.push(filters.organizationId)
    paramIndex++
  }

  query += ` ORDER BY sai.installed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  params.push(limit, offset)

  const result = await sql.query(query, params)

  return result.rows.map((row) => ({
    id: row.id as string,
    shop: row.shop as string,
    organizationId: row.organizationId as string,
    organizationName: row.organizationName as string,
    organizationSlug: row.organizationSlug as string,
    status: row.status as 'active' | 'uninstalled' | 'suspended',
    scopes: (row.scopes as string[]) || [],
    installedAt: new Date(row.installedAt as string),
    uninstalledAt: row.uninstalledAt ? new Date(row.uninstalledAt as string) : null,
  }))
}
