/**
 * Theme Loader
 *
 * Loads theme configuration from database with caching.
 * Uses tenant-isolated cache for performance.
 */

import { sql, withTenant, createTenantCache } from '@cgk-platform/db'
import type { PortalThemeConfig, PortalThemeConfigRow, SpacingDensity } from './types.js'
import { mergeWithDefaults } from './defaults.js'

/**
 * Cache TTL for theme config (5 minutes)
 */
const THEME_CACHE_TTL = 300

/**
 * Convert database row to theme config
 */
function rowToThemeConfig(row: PortalThemeConfigRow): PortalThemeConfig {
  return {
    tenantId: row.tenant_id,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    backgroundColor: row.background_color,
    cardBackgroundColor: row.card_background_color,
    borderColor: row.border_color,
    accentColor: row.accent_color,
    errorColor: row.error_color,
    successColor: row.success_color,
    warningColor: row.warning_color,
    foregroundColor: row.foreground_color,
    mutedForegroundColor: row.muted_foreground_color,
    fontFamily: row.font_family,
    headingFontFamily: row.heading_font_family,
    baseFontSize: row.base_font_size,
    lineHeight: parseFloat(row.line_height),
    headingLineHeight: parseFloat(row.heading_line_height),
    fontWeightNormal: row.font_weight_normal,
    fontWeightMedium: row.font_weight_medium,
    fontWeightBold: row.font_weight_bold,
    maxContentWidth: row.max_content_width,
    cardBorderRadius: row.card_border_radius,
    buttonBorderRadius: row.button_border_radius,
    inputBorderRadius: row.input_border_radius,
    spacing: row.spacing as SpacingDensity,
    logoUrl: row.logo_url,
    logoHeight: row.logo_height,
    logoDarkUrl: row.logo_dark_url,
    faviconUrl: row.favicon_url,
    darkModeEnabled: row.dark_mode_enabled,
    darkModeDefault: row.dark_mode_default,
    darkPrimaryColor: row.dark_primary_color,
    darkSecondaryColor: row.dark_secondary_color,
    darkBackgroundColor: row.dark_background_color,
    darkCardBackgroundColor: row.dark_card_background_color,
    darkBorderColor: row.dark_border_color,
    darkForegroundColor: row.dark_foreground_color,
    darkMutedForegroundColor: row.dark_muted_foreground_color,
    customCss: row.custom_css,
    customFontsUrl: row.custom_fonts_url,
  }
}

/**
 * Load theme configuration for a tenant
 * Uses caching for performance
 */
export async function loadThemeConfig(tenantSlug: string): Promise<PortalThemeConfig> {
  const cache = createTenantCache(tenantSlug)
  const cacheKey = 'portal-theme-config'

  // Try cache first
  const cached = await cache.get<PortalThemeConfig>(cacheKey)
  if (cached) {
    return cached
  }

  // Load from database
  const config = await loadThemeFromDatabase(tenantSlug)

  // Cache the result
  await cache.set(cacheKey, config, { ttl: THEME_CACHE_TTL })

  return config
}

/**
 * Load theme from database (no caching)
 */
export async function loadThemeFromDatabase(tenantSlug: string): Promise<PortalThemeConfig> {
  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<PortalThemeConfigRow>`
        SELECT * FROM portal_theme_config
        WHERE tenant_id = (
          SELECT id FROM public.organizations WHERE slug = ${tenantSlug} LIMIT 1
        )
        LIMIT 1
      `
    })

    if (result.rows.length > 0 && result.rows[0]) {
      return rowToThemeConfig(result.rows[0])
    }

    // Return defaults if no custom config exists
    return mergeWithDefaults({ tenantId: tenantSlug })
  } catch (error) {
    // Log error but return defaults to prevent blocking
    console.error(`Failed to load theme for tenant ${tenantSlug}:`, error)
    return mergeWithDefaults({ tenantId: tenantSlug })
  }
}

/**
 * Invalidate theme cache for a tenant
 * Call this when theme is updated
 */
export async function invalidateThemeCache(tenantSlug: string): Promise<void> {
  const cache = createTenantCache(tenantSlug)
  await cache.delete('portal-theme-config')
}

/**
 * Load theme for server-side rendering
 * This version doesn't require tenant context - used in RSC
 */
export async function loadThemeForSSR(tenantSlug: string): Promise<PortalThemeConfig> {
  // For SSR, we load directly without withTenant wrapper
  // since the query explicitly uses public.organizations
  const cache = createTenantCache(tenantSlug)
  const cacheKey = 'portal-theme-config'

  const cached = await cache.get<PortalThemeConfig>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Get tenant ID from public schema
    const orgResult = await sql<{ id: string }>`
      SELECT id FROM public.organizations
      WHERE slug = ${tenantSlug} AND status = 'active'
      LIMIT 1
    `

    if (orgResult.rows.length === 0) {
      return mergeWithDefaults({ tenantId: tenantSlug })
    }

    const tenantId = orgResult.rows[0]?.id
    if (!tenantId) {
      return mergeWithDefaults({ tenantId: tenantSlug })
    }

    // Load theme from tenant schema
    const themeResult = await withTenant(tenantSlug, async () => {
      return sql<PortalThemeConfigRow>`
        SELECT * FROM portal_theme_config
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `
    })

    if (themeResult.rows.length > 0 && themeResult.rows[0]) {
      const config = rowToThemeConfig(themeResult.rows[0])
      await cache.set(cacheKey, config, { ttl: THEME_CACHE_TTL })
      return config
    }

    const defaultConfig = mergeWithDefaults({ tenantId: tenantSlug })
    await cache.set(cacheKey, defaultConfig, { ttl: THEME_CACHE_TTL })
    return defaultConfig
  } catch (error) {
    console.error(`Failed to load theme for SSR (tenant: ${tenantSlug}):`, error)
    return mergeWithDefaults({ tenantId: tenantSlug })
  }
}
