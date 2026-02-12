/**
 * Samples database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  FulfillmentStatus,
  SampleOrderRow,
  SampleType,
  SamplesConfigRow,
  SamplesFilters,
  SamplesStats,
  UpdateSamplesConfigInput,
} from './types'

// ============================================================================
// Samples Configuration
// ============================================================================

export async function getSamplesConfig(): Promise<SamplesConfigRow | null> {
  const result = await sql<SamplesConfigRow>`
    SELECT id, ugc_tags, tiktok_tags, channel_patterns, zero_price_only, enabled, created_at, updated_at
    FROM samples_config
    LIMIT 1
  `
  return result.rows[0] || null
}

export async function updateSamplesConfig(input: UpdateSamplesConfigInput): Promise<SamplesConfigRow> {
  const current = await getSamplesConfig()

  if (!current) {
    // Create default config first
    const ugcTagsStr = `{${(input.ugcTags ?? ['ugc-sample', 'ugc', 'creator-sample']).join(',')}}`
    const tiktokTagsStr = `{${(input.tiktokTags ?? ['tiktok-sample', 'tiktok-shop-sample']).join(',')}}`
    const channelPatternsStr = `{${(input.channelPatterns ?? ['tiktok%', '%tiktok shop%']).join(',')}}`

    const defaultResult = await sql<SamplesConfigRow>`
      INSERT INTO samples_config (ugc_tags, tiktok_tags, channel_patterns, zero_price_only, enabled)
      VALUES (
        ${ugcTagsStr}::text[],
        ${tiktokTagsStr}::text[],
        ${channelPatternsStr}::text[],
        ${input.zeroPriceOnly ?? true},
        ${input.enabled ?? true}
      )
      RETURNING id, ugc_tags, tiktok_tags, channel_patterns, zero_price_only, enabled, created_at, updated_at
    `
    return defaultResult.rows[0]!
  }

  const ugcTags = input.ugcTags ?? current.ugc_tags
  const tiktokTags = input.tiktokTags ?? current.tiktok_tags
  const channelPatterns = input.channelPatterns ?? current.channel_patterns
  const zeroPriceOnly = input.zeroPriceOnly ?? current.zero_price_only
  const enabled = input.enabled ?? current.enabled

  const ugcTagsStr = `{${ugcTags.join(',')}}`
  const tiktokTagsStr = `{${tiktokTags.join(',')}}`
  const channelPatternsStr = `{${channelPatterns.join(',')}}`

  const result = await sql<SamplesConfigRow>`
    UPDATE samples_config SET
      ugc_tags = ${ugcTagsStr}::text[],
      tiktok_tags = ${tiktokTagsStr}::text[],
      channel_patterns = ${channelPatternsStr}::text[],
      zero_price_only = ${zeroPriceOnly},
      enabled = ${enabled},
      updated_at = NOW()
    WHERE id = ${current.id}
    RETURNING id, ugc_tags, tiktok_tags, channel_patterns, zero_price_only, enabled, created_at, updated_at
  `
  return result.rows[0]!
}

// ============================================================================
// Samples Queries
// ============================================================================

export async function getSamples(filters: SamplesFilters): Promise<{
  rows: SampleOrderRow[]
  totalCount: number
}> {
  const config = await getSamplesConfig()
  if (!config || !config.enabled) {
    return { rows: [], totalCount: 0 }
  }

  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  // Base sample detection condition
  paramIndex++
  const ugcTagsParam = paramIndex
  paramIndex++
  const tiktokTagsParam = paramIndex
  paramIndex++
  const channelPatternsParam = paramIndex
  values.push(config.ugc_tags, config.tiktok_tags, config.channel_patterns)

  // Build sample detection where clause
  const sampleCondition = `(
    o.tags::text[] && $${ugcTagsParam}::text[]
    OR o.tags::text[] && $${tiktokTagsParam}::text[]
    OR o.source_name ILIKE ANY($${channelPatternsParam}::text[])
  )`
  conditions.push(sampleCondition)

  // Zero price filter
  if (config.zero_price_only) {
    conditions.push('o.total_price_cents = 0')
  }

  // Search filter
  if (filters.search) {
    paramIndex++
    conditions.push(`(o.order_number ILIKE $${paramIndex} OR o.email ILIKE $${paramIndex} OR o.customer_name ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  // Type filter
  if (filters.type === 'ugc') {
    conditions.push(`o.tags::text[] && $${ugcTagsParam}::text[]`)
    conditions.push(`NOT (o.tags::text[] && $${tiktokTagsParam}::text[] OR o.source_name ILIKE ANY($${channelPatternsParam}::text[]))`)
  } else if (filters.type === 'tiktok') {
    conditions.push(`(o.tags::text[] && $${tiktokTagsParam}::text[] OR o.source_name ILIKE ANY($${channelPatternsParam}::text[]))`)
  }

  // Fulfillment status filter
  if (filters.fulfillmentStatus) {
    paramIndex++
    conditions.push(`o.fulfillment_status = $${paramIndex}`)
    values.push(filters.fulfillmentStatus)
  }

  // Date filters
  if (filters.dateFrom) {
    paramIndex++
    conditions.push(`o.order_placed_at >= $${paramIndex}::timestamptz`)
    values.push(filters.dateFrom)
  }

  if (filters.dateTo) {
    paramIndex++
    conditions.push(`o.order_placed_at <= $${paramIndex}::timestamptz`)
    values.push(filters.dateTo)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`

  const sortColumns: Record<string, string> = {
    order_placed_at: 'o.order_placed_at',
    order_number: 'o.order_number',
    customer_name: 'o.customer_name',
    total_price_cents: 'o.total_price_cents',
  }
  const sortCol = sortColumns[filters.sort] || 'o.order_placed_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT
      o.id AS order_id,
      o.order_number,
      o.email AS customer_email,
      o.customer_name,
      o.total_price_cents,
      o.currency,
      o.fulfillment_status,
      o.tags,
      o.source_name AS channel,
      o.order_placed_at,
      o.created_at,
      CASE
        WHEN o.tags::text[] && $${tiktokTagsParam}::text[] OR o.source_name ILIKE ANY($${channelPatternsParam}::text[]) THEN 'tiktok'
        WHEN o.tags::text[] && $${ugcTagsParam}::text[] THEN 'ugc'
        ELSE 'unknown'
      END AS sample_type
    FROM orders o
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir} NULLS LAST
    LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as SampleOrderRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getSamplesStats(): Promise<SamplesStats> {
  const config = await getSamplesConfig()
  if (!config || !config.enabled) {
    return {
      total: 0,
      ugc: 0,
      tiktok: 0,
      unknown: 0,
      unfulfilled: 0,
      partial: 0,
      fulfilled: 0,
    }
  }

  const result = await sql.query<{
    total: string
    ugc: string
    tiktok: string
    unknown: string
    unfulfilled: string
    partial: string
    fulfilled: string
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE
        o.tags::text[] && $1::text[]
        AND NOT (o.tags::text[] && $2::text[] OR o.source_name ILIKE ANY($3::text[]))
      )::text AS ugc,
      COUNT(*) FILTER (WHERE
        o.tags::text[] && $2::text[] OR o.source_name ILIKE ANY($3::text[])
      )::text AS tiktok,
      COUNT(*) FILTER (WHERE
        NOT (o.tags::text[] && $1::text[])
        AND NOT (o.tags::text[] && $2::text[] OR o.source_name ILIKE ANY($3::text[]))
      )::text AS unknown,
      COUNT(*) FILTER (WHERE o.fulfillment_status = 'unfulfilled' OR o.fulfillment_status IS NULL)::text AS unfulfilled,
      COUNT(*) FILTER (WHERE o.fulfillment_status = 'partial')::text AS partial,
      COUNT(*) FILTER (WHERE o.fulfillment_status = 'fulfilled')::text AS fulfilled
    FROM orders o
    WHERE (
      o.tags::text[] && $1::text[]
      OR o.tags::text[] && $2::text[]
      OR o.source_name ILIKE ANY($3::text[])
    )
    ${config.zero_price_only ? 'AND o.total_price_cents = 0' : ''}`,
    [config.ugc_tags, config.tiktok_tags, config.channel_patterns]
  )

  const row = result.rows[0]
  return {
    total: Number(row?.total || 0),
    ugc: Number(row?.ugc || 0),
    tiktok: Number(row?.tiktok || 0),
    unknown: Number(row?.unknown || 0),
    unfulfilled: Number(row?.unfulfilled || 0),
    partial: Number(row?.partial || 0),
    fulfilled: Number(row?.fulfilled || 0),
  }
}

// ============================================================================
// Sample Detail
// ============================================================================

export async function getSampleById(orderId: string): Promise<SampleOrderRow | null> {
  const config = await getSamplesConfig()
  if (!config) return null

  const result = await sql.query<SampleOrderRow>(
    `SELECT
      o.id AS order_id,
      o.order_number,
      o.email AS customer_email,
      o.customer_name,
      o.total_price_cents,
      o.currency,
      o.fulfillment_status,
      o.tags,
      o.source_name AS channel,
      o.order_placed_at,
      o.created_at,
      CASE
        WHEN o.tags::text[] && $2::text[] OR o.source_name ILIKE ANY($3::text[]) THEN 'tiktok'
        WHEN o.tags::text[] && $1::text[] THEN 'ugc'
        ELSE 'unknown'
      END AS sample_type
    FROM orders o
    WHERE o.id = $4`,
    [config.ugc_tags, config.tiktok_tags, config.channel_patterns, orderId]
  )

  return result.rows[0] || null
}

// ============================================================================
// Helper Functions
// ============================================================================

export function mapFulfillmentStatus(status: string | null): FulfillmentStatus {
  switch (status?.toLowerCase()) {
    case 'fulfilled':
      return 'fulfilled'
    case 'partial':
    case 'partially_fulfilled':
      return 'partial'
    case 'restocked':
      return 'restocked'
    case 'unfulfilled':
    case null:
    default:
      return 'unfulfilled'
  }
}

export function mapSampleType(type: string | null): SampleType {
  switch (type?.toLowerCase()) {
    case 'ugc':
      return 'ugc'
    case 'tiktok':
      return 'tiktok'
    default:
      return 'unknown'
  }
}
