/**
 * Server-side analytics configuration loader
 *
 * Reads per-tenant analytics pixel IDs from the site_config table.
 * This runs server-side only — do NOT import in client components.
 */

import 'server-only'
import { sql, withTenant } from '@cgk-platform/db'

export interface AnalyticsConfig {
  ga4MeasurementId: string | null
  fbPixelId: string | null
  tiktokPixelId: string | null
}

/**
 * Load analytics pixel IDs for a tenant from the site_config table.
 * Returns null values when not configured.
 */
export async function getAnalyticsConfig(
  tenantSlug: string
): Promise<AnalyticsConfig> {
  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<{
        ga4_measurement_id: string | null
        fb_pixel_id: string | null
        tiktok_pixel_id: string | null
      }>`
        SELECT
          ga4_measurement_id,
          fb_pixel_id,
          tiktok_pixel_id
        FROM site_config
        LIMIT 1
      `
    })

    const row = result.rows[0]
    return {
      ga4MeasurementId: row?.ga4_measurement_id ?? null,
      fbPixelId: row?.fb_pixel_id ?? null,
      tiktokPixelId: row?.tiktok_pixel_id ?? null,
    }
  } catch {
    // site_config may not exist for this tenant yet
    return { ga4MeasurementId: null, fbPixelId: null, tiktokPixelId: null }
  }
}
