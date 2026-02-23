import { withTenant, sql } from '@cgk-platform/db'

import type { Bundle, CreateBundleInput, UpdateBundleInput, BundleOrderStats } from './types'

function rowToBundle(row: Record<string, unknown>): Bundle {
  return {
    id: row.id as string,
    name: row.name as string,
    headline: row.headline as string | null,
    description: row.description as string | null,
    status: row.status as Bundle['status'],
    items: (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) as Bundle['items'],
    discountType: row.discount_type as Bundle['discountType'],
    tiers: (typeof row.tiers === 'string' ? JSON.parse(row.tiers) : row.tiers) as Bundle['tiers'],
    minItems: row.min_items as number,
    maxItems: row.max_items as number,
    layout: row.layout as Bundle['layout'],
    columnsDesktop: row.columns_desktop as number,
    imageRatio: row.image_ratio as Bundle['imageRatio'],
    ctaText: row.cta_text as string,
    showSavings: row.show_savings as boolean,
    showTierProgress: row.show_tier_progress as boolean,
    enableQuantity: row.enable_quantity as boolean,
    bgColor: row.bg_color as string | null,
    textColor: row.text_color as string | null,
    accentColor: row.accent_color as string | null,
    shopifySectionId: row.shopify_section_id as string | null,
    createdBy: row.created_by as string | null,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  }
}

export async function getBundles(
  tenantSlug: string,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ bundles: Bundle[]; totalCount: number }> {
  const { status, limit = 50, offset = 0 } = options

  return withTenant(tenantSlug, async () => {
    const countResult = status
      ? await sql`SELECT COUNT(*)::int AS count FROM bundles WHERE status = ${status}`
      : await sql`SELECT COUNT(*)::int AS count FROM bundles`

    const totalCount = (countResult.rows[0] as Record<string, unknown>)?.count as number ?? 0

    const result = status
      ? await sql`
          SELECT * FROM bundles
          WHERE status = ${status}
          ORDER BY created_at DESC
          OFFSET ${offset} LIMIT ${limit}
        `
      : await sql`
          SELECT * FROM bundles
          ORDER BY created_at DESC
          OFFSET ${offset} LIMIT ${limit}
        `

    return {
      bundles: result.rows.map((r) => rowToBundle(r as Record<string, unknown>)),
      totalCount,
    }
  })
}

export async function getBundle(tenantSlug: string, id: string): Promise<Bundle | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`SELECT * FROM bundles WHERE id = ${id}`
    const row = result.rows[0]
    if (!row) return null
    return rowToBundle(row as Record<string, unknown>)
  })
}

export async function createBundle(
  tenantSlug: string,
  input: CreateBundleInput,
  userId?: string,
): Promise<Bundle> {
  const itemsJson = JSON.stringify(input.items ?? [])
  const tiersJson = JSON.stringify(input.tiers ?? [])

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO bundles (
        name, headline, description, items, discount_type, tiers,
        min_items, max_items, layout, columns_desktop, image_ratio,
        cta_text, show_savings, show_tier_progress, enable_quantity,
        bg_color, text_color, accent_color, created_by
      ) VALUES (
        ${input.name},
        ${input.headline ?? null},
        ${input.description ?? null},
        ${itemsJson}::jsonb,
        ${input.discount_type ?? 'percentage'},
        ${tiersJson}::jsonb,
        ${input.min_items ?? 2},
        ${input.max_items ?? 8},
        ${input.layout ?? 'grid'},
        ${input.columns_desktop ?? 3},
        ${input.image_ratio ?? 'square'},
        ${input.cta_text ?? 'Add Bundle to Cart'},
        ${input.show_savings !== false},
        ${input.show_tier_progress !== false},
        ${input.enable_quantity !== false},
        ${input.bg_color ?? null},
        ${input.text_color ?? null},
        ${input.accent_color ?? null},
        ${userId ?? null}
      )
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) throw new Error('Failed to create bundle')
    return rowToBundle(row as Record<string, unknown>)
  })
}

export async function updateBundle(
  tenantSlug: string,
  id: string,
  input: UpdateBundleInput,
): Promise<Bundle | null> {
  return withTenant(tenantSlug, async () => {
    // Build update fields dynamically — use explicit branches for each field combo
    // We update all settable fields at once to keep it simple
    const itemsJson = input.items !== undefined ? JSON.stringify(input.items) : null
    const tiersJson = input.tiers !== undefined ? JSON.stringify(input.tiers) : null

    const result = await sql`
      UPDATE bundles SET
        name = COALESCE(${input.name ?? null}, name),
        headline = CASE WHEN ${input.headline !== undefined} THEN ${input.headline ?? null} ELSE headline END,
        description = CASE WHEN ${input.description !== undefined} THEN ${input.description ?? null} ELSE description END,
        items = CASE WHEN ${itemsJson !== null} THEN ${itemsJson}::jsonb ELSE items END,
        discount_type = COALESCE(${input.discount_type ?? null}, discount_type),
        tiers = CASE WHEN ${tiersJson !== null} THEN ${tiersJson}::jsonb ELSE tiers END,
        min_items = COALESCE(${input.min_items ?? null}, min_items),
        max_items = COALESCE(${input.max_items ?? null}, max_items),
        layout = COALESCE(${input.layout ?? null}, layout),
        columns_desktop = COALESCE(${input.columns_desktop ?? null}, columns_desktop),
        image_ratio = COALESCE(${input.image_ratio ?? null}, image_ratio),
        cta_text = COALESCE(${input.cta_text ?? null}, cta_text),
        show_savings = COALESCE(${input.show_savings ?? null}, show_savings),
        show_tier_progress = COALESCE(${input.show_tier_progress ?? null}, show_tier_progress),
        enable_quantity = COALESCE(${input.enable_quantity ?? null}, enable_quantity),
        bg_color = CASE WHEN ${input.bg_color !== undefined} THEN ${input.bg_color ?? null} ELSE bg_color END,
        text_color = CASE WHEN ${input.text_color !== undefined} THEN ${input.text_color ?? null} ELSE text_color END,
        accent_color = CASE WHEN ${input.accent_color !== undefined} THEN ${input.accent_color ?? null} ELSE accent_color END,
        status = COALESCE(${input.status ?? null}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    const row = result.rows[0]
    if (!row) return null
    return rowToBundle(row as Record<string, unknown>)
  })
}

export async function deleteBundle(tenantSlug: string, id: string): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`DELETE FROM bundles WHERE id = ${id}`
    return (result.rowCount ?? 0) > 0
  })
}

export async function getBundleOrderStats(
  tenantSlug: string,
  bundleId: string,
): Promise<BundleOrderStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(total_cents), 0)::bigint AS total_revenue,
        COALESCE(SUM(discount_cents), 0)::bigint AS total_discount,
        COALESCE(AVG(items_count), 0)::float AS avg_order_size
      FROM bundle_orders
      WHERE bundle_id = ${bundleId}
    `
    const row = result.rows[0] as Record<string, unknown> | undefined
    return {
      totalOrders: (row?.total_orders as number) ?? 0,
      totalRevenue: Number(row?.total_revenue ?? 0),
      totalDiscount: Number(row?.total_discount ?? 0),
      avgOrderSize: Number(row?.avg_order_size ?? 0),
    }
  })
}
