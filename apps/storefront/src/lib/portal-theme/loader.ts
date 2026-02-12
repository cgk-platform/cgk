/**
 * Portal Theme Loader
 *
 * Loads portal theme configuration from database for a specific tenant.
 * Supports caching and SSR-compatible loading.
 */

import { sql, withTenant } from '@cgk/db'
import { cache } from 'react'

import type { CustomerPortalThemeConfig } from './types'
import { createPortalTheme } from './defaults'

/**
 * Database row type for portal theme configuration
 */
interface PortalThemeRow {
  tenant_id: string
  config: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Load portal theme from database
 * Cached per-request to avoid multiple DB queries
 */
export const loadPortalTheme = cache(
  async (tenantId: string): Promise<CustomerPortalThemeConfig> => {
    try {
      const result = await withTenant(tenantId, async () => {
        return sql<PortalThemeRow>`
          SELECT
            tenant_id,
            config,
            created_at,
            updated_at
          FROM portal_theme_config
          WHERE tenant_id = ${tenantId}
          LIMIT 1
        `
      })

      const row = result.rows[0]
      if (!row || !row.config) {
        return createPortalTheme(tenantId)
      }

      // Parse and merge with defaults
      const savedConfig = typeof row.config === 'string'
        ? JSON.parse(row.config)
        : row.config

      return createPortalTheme(tenantId, savedConfig)
    } catch (error) {
      console.error('Failed to load portal theme:', error)
      return createPortalTheme(tenantId)
    }
  }
)

/**
 * Load portal theme for SSR
 * Returns theme configuration for server-side rendering
 */
export async function loadPortalThemeForSSR(
  tenantSlug: string
): Promise<CustomerPortalThemeConfig> {
  try {
    // First resolve tenant ID from slug
    const tenantResult = await sql<{ id: string }>`
      SELECT id FROM public.organizations
      WHERE slug = ${tenantSlug}
      LIMIT 1
    `

    const tenant = tenantResult.rows[0]
    if (!tenant) {
      return createPortalTheme('default')
    }

    return loadPortalTheme(tenant.id)
  } catch (error) {
    console.error('Failed to load portal theme for SSR:', error)
    return createPortalTheme('default')
  }
}

/**
 * Save portal theme to database
 */
export async function savePortalTheme(
  tenantId: string,
  config: Partial<Omit<CustomerPortalThemeConfig, 'tenantId'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const configJson = JSON.stringify(config)

    await withTenant(tenantId, async () => {
      return sql`
        INSERT INTO portal_theme_config (tenant_id, config, updated_at)
        VALUES (${tenantId}, ${configJson}::jsonb, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          config = ${configJson}::jsonb,
          updated_at = NOW()
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to save portal theme:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reset portal theme to defaults
 */
export async function resetPortalTheme(
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await withTenant(tenantId, async () => {
      return sql`
        DELETE FROM portal_theme_config
        WHERE tenant_id = ${tenantId}
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to reset portal theme:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Invalidate portal theme cache for a tenant
 * Call this after theme updates
 */
export function invalidatePortalThemeCache(tenantId: string): void {
  // React cache invalidation happens automatically per-request
  // This function is a placeholder for future cache implementations
  // (e.g., Redis, CDN cache)
  void tenantId
}

/**
 * Get theme with live preview overrides
 * Used in admin preview mode
 */
export function getThemeWithPreview(
  baseTheme: CustomerPortalThemeConfig,
  previewOverrides: Partial<CustomerPortalThemeConfig>
): CustomerPortalThemeConfig {
  return createPortalTheme(baseTheme.tenantId, {
    ...baseTheme,
    ...previewOverrides,
    sidebar: {
      ...baseTheme.sidebar,
      ...(previewOverrides.sidebar || {}),
    },
    header: {
      ...baseTheme.header,
      ...(previewOverrides.header || {}),
    },
    nav: {
      ...baseTheme.nav,
      ...(previewOverrides.nav || {}),
    },
    card: {
      ...baseTheme.card,
      ...(previewOverrides.card || {}),
    },
    button: {
      ...baseTheme.button,
      ...(previewOverrides.button || {}),
    },
    emptyState: {
      ...baseTheme.emptyState,
      ...(previewOverrides.emptyState || {}),
    },
    loading: {
      ...baseTheme.loading,
      ...(previewOverrides.loading || {}),
    },
  })
}
