/**
 * Bundle Configuration Reader
 *
 * Reads bundle configs from the tenant DB (bundles table).
 * The Storefront API cannot read automatic discount metafields,
 * so we read from the DB where the admin app syncs bundle configs.
 */

import { withTenant, sql } from '@cgk-platform/db'

import { getTenantSlug } from './tenant'
import type { BundleConfig, BundleTheme } from '@/components/bundles/types'

interface BundleRow {
  id: string
  shopify_discount_id: string | null
  name: string
  status: string
  discount_type: string
  min_items: number
  max_items: number
  items: unknown
  tiers: unknown
  layout: string | null
  columns_desktop: number | null
  image_ratio: string | null
  cta_text: string | null
  show_savings: boolean
  show_tier_progress: boolean
  bg_color: string | null
  text_color: string | null
  accent_color: string | null
  created_at: string
  updated_at: string
}

interface StorefrontBundleConfig extends BundleConfig {
  theme: BundleTheme
  layout: 'grid' | 'list'
  columnsDesktop: number
  imageRatio: string
  ctaText: string
  showSavings: boolean
  showTierProgress: boolean
}

function mapRowToConfig(row: BundleRow): StorefrontBundleConfig {
  const tiers = Array.isArray(row.tiers) ? row.tiers : []

  return {
    bundleId: row.id,
    bundleName: row.name,
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    tiers: tiers.map((t: Record<string, unknown>) => ({
      count: Number(t.count ?? 0),
      discount: Number(t.discount ?? 0),
      label: (t.label as string) ?? undefined,
      freeGiftVariantId: (t.freeGiftVariantId as string) ?? undefined,
    })),
    minItems: row.min_items,
    maxItems: row.max_items,
    theme: {
      bgColor: row.bg_color ?? undefined,
      textColor: row.text_color ?? undefined,
      accentColor: row.accent_color ?? undefined,
    },
    layout: row.layout === 'list' ? 'list' : 'grid',
    columnsDesktop: row.columns_desktop ?? 3,
    imageRatio: row.image_ratio ?? 'square',
    ctaText: row.cta_text ?? 'Add Bundle to Cart',
    showSavings: row.show_savings,
    showTierProgress: row.show_tier_progress,
  }
}

/**
 * Get a single bundle config by ID
 */
export async function getBundleConfig(bundleId: string): Promise<StorefrontBundleConfig | null> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return null

  const result = await withTenant(tenantSlug, () =>
    sql`SELECT * FROM bundles WHERE id = ${bundleId} AND status = 'active' LIMIT 1`
  )

  const row = result.rows[0]
  if (!row) return null

  return mapRowToConfig(row as unknown as BundleRow)
}

/**
 * List all active bundle configs
 */
export async function listActiveBundles(): Promise<StorefrontBundleConfig[]> {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) return []

  const result = await withTenant(tenantSlug, () =>
    sql`SELECT * FROM bundles WHERE status = 'active' ORDER BY created_at DESC`
  )

  return result.rows.map(
    (row) => mapRowToConfig(row as unknown as BundleRow)
  )
}
