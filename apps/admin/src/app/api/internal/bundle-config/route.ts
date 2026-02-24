/**
 * Internal Bundle Config API
 *
 * Receives bundle config from the Shopify app and upserts
 * into the tenant bundles table.
 */

import { NextResponse } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

export async function POST(request: Request) {
  // Validate internal API key
  const authHeader = request.headers.get('authorization')
  if (!INTERNAL_API_KEY || authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    tenantSlug,
    bundleId,
    name,
    shopifyDiscountId,
    discountType,
    minItems,
    maxItems,
    items,
    tiers,
    layout,
    columnsDesktop,
    imageRatio,
    ctaText,
    showSavings,
    showTierProgress,
    bgColor,
    textColor,
    accentColor,
    status,
  } = body as {
    tenantSlug?: string
    bundleId?: string
    name?: string
    shopifyDiscountId?: string | null
    discountType?: string
    minItems?: number
    maxItems?: number
    items?: unknown[]
    tiers?: unknown[]
    layout?: string
    columnsDesktop?: number
    imageRatio?: string
    ctaText?: string
    showSavings?: boolean
    showTierProgress?: boolean
    bgColor?: string | null
    textColor?: string | null
    accentColor?: string | null
    status?: string
  }

  if (!tenantSlug || !bundleId || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: tenantSlug, bundleId, name' },
      { status: 400 }
    )
  }

  const itemsJson = JSON.stringify(items ?? [])
  const tiersJson = JSON.stringify(tiers ?? [])

  try {
    await withTenant(tenantSlug, () =>
      sql`
        INSERT INTO bundles (
          id, shopify_discount_id, name, status,
          discount_type, min_items, max_items,
          items, tiers,
          layout, columns_desktop, image_ratio, cta_text,
          show_savings, show_tier_progress,
          bg_color, text_color, accent_color,
          updated_at
        ) VALUES (
          ${bundleId},
          ${shopifyDiscountId ?? null},
          ${name},
          ${status ?? 'active'},
          ${discountType ?? 'percentage'},
          ${minItems ?? 1},
          ${maxItems ?? 10},
          ${itemsJson}::jsonb,
          ${tiersJson}::jsonb,
          ${layout ?? 'grid'},
          ${columnsDesktop ?? 3},
          ${imageRatio ?? 'square'},
          ${ctaText ?? 'Add Bundle to Cart'},
          ${showSavings ?? false},
          ${showTierProgress ?? true},
          ${bgColor ?? null},
          ${textColor ?? null},
          ${accentColor ?? null},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          shopify_discount_id = EXCLUDED.shopify_discount_id,
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          discount_type = EXCLUDED.discount_type,
          min_items = EXCLUDED.min_items,
          max_items = EXCLUDED.max_items,
          items = EXCLUDED.items,
          tiers = EXCLUDED.tiers,
          layout = EXCLUDED.layout,
          columns_desktop = EXCLUDED.columns_desktop,
          image_ratio = EXCLUDED.image_ratio,
          cta_text = EXCLUDED.cta_text,
          show_savings = EXCLUDED.show_savings,
          show_tier_progress = EXCLUDED.show_tier_progress,
          bg_color = EXCLUDED.bg_color,
          text_color = EXCLUDED.text_color,
          accent_color = EXCLUDED.accent_color,
          updated_at = NOW()
      `
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[bundle-config] Upsert failed:', error)
    return NextResponse.json(
      { error: 'Failed to save bundle config' },
      { status: 500 }
    )
  }
}
