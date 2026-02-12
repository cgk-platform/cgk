/**
 * Segments database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  CachedSegmentRow,
  CustomerRfmSegmentRow,
  KlaviyoSyncConfigRow,
  RfmCustomerFilters,
  RfmSegmentType,
  SegmentFilters,
  SegmentMembershipRow,
} from './types'

// ============================================================================
// Shopify Cached Segments
// ============================================================================

export async function getCachedSegments(filters: SegmentFilters): Promise<{
  rows: CachedSegmentRow[]
  totalCount: number
}> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(name ILIKE $${paramIndex} OR query ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, shopify_segment_id, name, query, member_count, synced_at, created_at, updated_at
     FROM cached_segments
     ${whereClause}
     ORDER BY name ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM cached_segments ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as CachedSegmentRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getCachedSegmentById(id: string): Promise<CachedSegmentRow | null> {
  const result = await sql<CachedSegmentRow>`
    SELECT id, shopify_segment_id, name, query, member_count, synced_at, created_at, updated_at
    FROM cached_segments
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

export async function upsertCachedSegment(
  shopifySegmentId: string,
  name: string,
  query: string | null,
  memberCount: number
): Promise<CachedSegmentRow> {
  const result = await sql<CachedSegmentRow>`
    INSERT INTO cached_segments (shopify_segment_id, name, query, member_count, synced_at)
    VALUES (${shopifySegmentId}, ${name}, ${query}, ${memberCount}, NOW())
    ON CONFLICT (shopify_segment_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      query = EXCLUDED.query,
      member_count = EXCLUDED.member_count,
      synced_at = NOW(),
      updated_at = NOW()
    RETURNING id, shopify_segment_id, name, query, member_count, synced_at, created_at, updated_at
  `
  return result.rows[0]!
}

export async function deleteCachedSegment(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM cached_segments WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

export async function deleteStaleSegments(shopifySegmentIds: string[]): Promise<number> {
  if (shopifySegmentIds.length === 0) {
    const result = await sql`DELETE FROM cached_segments`
    return result.rowCount ?? 0
  }
  const idsArrayStr = `{${shopifySegmentIds.join(',')}}`
  const result = await sql`
    DELETE FROM cached_segments
    WHERE shopify_segment_id != ALL(${idsArrayStr}::text[])
  `
  return result.rowCount ?? 0
}

// ============================================================================
// RFM Segments
// ============================================================================

export async function getRfmCustomers(filters: RfmCustomerFilters): Promise<{
  rows: CustomerRfmSegmentRow[]
  totalCount: number
}> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(customer_email ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex} OR customer_id ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  if (filters.segment) {
    paramIndex++
    conditions.push(`segment = $${paramIndex}::rfm_segment_type`)
    values.push(filters.segment)
  }

  if (filters.minRfmScore !== null) {
    paramIndex++
    conditions.push(`rfm_score >= $${paramIndex}`)
    values.push(filters.minRfmScore)
  }

  if (filters.maxRfmScore !== null) {
    paramIndex++
    conditions.push(`rfm_score <= $${paramIndex}`)
    values.push(filters.maxRfmScore)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sortColumns: Record<string, string> = {
    rfm_score: 'rfm_score',
    r_score: 'r_score',
    f_score: 'f_score',
    m_score: 'm_score',
    monetary_total_cents: 'monetary_total_cents',
    recency_days: 'recency_days',
    frequency_count: 'frequency_count',
    calculated_at: 'calculated_at',
  }
  const sortCol = sortColumns[filters.sort] || 'rfm_score'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, customer_id, customer_email, customer_name, r_score, f_score, m_score,
            rfm_score, segment, recency_days, frequency_count, monetary_total_cents,
            currency, first_order_at, last_order_at, calculated_at, created_at, updated_at
     FROM customer_rfm_segments
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM customer_rfm_segments ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as CustomerRfmSegmentRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getRfmSegmentDistribution(): Promise<{
  total: number
  segments: Array<{
    segment: RfmSegmentType
    count: number
    avg_monetary: number
    avg_frequency: number
    avg_recency: number
  }>
  calculatedAt: string | null
}> {
  const totalResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM customer_rfm_segments
  `
  const total = Number(totalResult.rows[0]?.count || 0)

  const segmentsResult = await sql<{
    segment: RfmSegmentType
    count: string
    avg_monetary: string
    avg_frequency: string
    avg_recency: string
  }>`
    SELECT
      segment,
      COUNT(*)::text as count,
      COALESCE(AVG(monetary_total_cents), 0)::text as avg_monetary,
      COALESCE(AVG(frequency_count), 0)::text as avg_frequency,
      COALESCE(AVG(recency_days), 0)::text as avg_recency
    FROM customer_rfm_segments
    GROUP BY segment
    ORDER BY COUNT(*) DESC
  `

  const lastCalculatedResult = await sql<{ calculated_at: string }>`
    SELECT calculated_at FROM customer_rfm_segments ORDER BY calculated_at DESC LIMIT 1
  `

  return {
    total,
    segments: segmentsResult.rows.map((row) => ({
      segment: row.segment,
      count: Number(row.count),
      avg_monetary: Number(row.avg_monetary),
      avg_frequency: Number(row.avg_frequency),
      avg_recency: Number(row.avg_recency),
    })),
    calculatedAt: lastCalculatedResult.rows[0]?.calculated_at || null,
  }
}

export async function upsertRfmCustomer(data: {
  customerId: string
  customerEmail: string | null
  customerName: string | null
  rScore: number
  fScore: number
  mScore: number
  recencyDays: number | null
  frequencyCount: number | null
  monetaryTotalCents: number | null
  currency: string
  firstOrderAt: string | null
  lastOrderAt: string | null
}): Promise<CustomerRfmSegmentRow> {
  const result = await sql<CustomerRfmSegmentRow>`
    INSERT INTO customer_rfm_segments (
      customer_id, customer_email, customer_name, r_score, f_score, m_score,
      recency_days, frequency_count, monetary_total_cents, currency,
      first_order_at, last_order_at, calculated_at
    )
    VALUES (
      ${data.customerId}, ${data.customerEmail}, ${data.customerName},
      ${data.rScore}, ${data.fScore}, ${data.mScore},
      ${data.recencyDays}, ${data.frequencyCount}, ${data.monetaryTotalCents},
      ${data.currency}, ${data.firstOrderAt}::timestamptz, ${data.lastOrderAt}::timestamptz, NOW()
    )
    ON CONFLICT (customer_id)
    DO UPDATE SET
      customer_email = EXCLUDED.customer_email,
      customer_name = EXCLUDED.customer_name,
      r_score = EXCLUDED.r_score,
      f_score = EXCLUDED.f_score,
      m_score = EXCLUDED.m_score,
      recency_days = EXCLUDED.recency_days,
      frequency_count = EXCLUDED.frequency_count,
      monetary_total_cents = EXCLUDED.monetary_total_cents,
      currency = EXCLUDED.currency,
      first_order_at = EXCLUDED.first_order_at,
      last_order_at = EXCLUDED.last_order_at,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING id, customer_id, customer_email, customer_name, r_score, f_score, m_score,
              rfm_score, segment, recency_days, frequency_count, monetary_total_cents,
              currency, first_order_at, last_order_at, calculated_at, created_at, updated_at
  `
  return result.rows[0]!
}

export async function deleteAllRfmSegments(): Promise<number> {
  const result = await sql`DELETE FROM customer_rfm_segments`
  return result.rowCount ?? 0
}

// ============================================================================
// Segment Membership Cache
// ============================================================================

export async function getSegmentMembers(segmentId: string, limit: number, offset: number): Promise<{
  rows: SegmentMembershipRow[]
  totalCount: number
}> {
  const dataResult = await sql<SegmentMembershipRow>`
    SELECT id, segment_id, customer_id, customer_email, cached_at
    FROM segment_membership_cache
    WHERE segment_id = ${segmentId}
    ORDER BY cached_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM segment_membership_cache WHERE segment_id = ${segmentId}
  `

  return {
    rows: dataResult.rows,
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function upsertSegmentMember(
  segmentId: string,
  customerId: string,
  customerEmail: string | null
): Promise<SegmentMembershipRow> {
  const result = await sql<SegmentMembershipRow>`
    INSERT INTO segment_membership_cache (segment_id, customer_id, customer_email, cached_at)
    VALUES (${segmentId}, ${customerId}, ${customerEmail}, NOW())
    ON CONFLICT (segment_id, customer_id)
    DO UPDATE SET customer_email = EXCLUDED.customer_email, cached_at = NOW()
    RETURNING id, segment_id, customer_id, customer_email, cached_at
  `
  return result.rows[0]!
}

export async function clearSegmentMembers(segmentId: string): Promise<number> {
  const result = await sql`DELETE FROM segment_membership_cache WHERE segment_id = ${segmentId}`
  return result.rowCount ?? 0
}

// ============================================================================
// Klaviyo Sync Config
// ============================================================================

export async function getKlaviyoSyncConfigs(): Promise<KlaviyoSyncConfigRow[]> {
  const result = await sql<KlaviyoSyncConfigRow>`
    SELECT id, api_key_encrypted, api_key_set, segment_type, segment_id,
           klaviyo_list_id, klaviyo_list_name, sync_direction,
           last_synced_at, last_sync_count, enabled, created_at, updated_at
    FROM klaviyo_sync_config
    ORDER BY created_at DESC
  `
  return result.rows
}

export async function getKlaviyoSyncConfigById(id: string): Promise<KlaviyoSyncConfigRow | null> {
  const result = await sql<KlaviyoSyncConfigRow>`
    SELECT id, api_key_encrypted, api_key_set, segment_type, segment_id,
           klaviyo_list_id, klaviyo_list_name, sync_direction,
           last_synced_at, last_sync_count, enabled, created_at, updated_at
    FROM klaviyo_sync_config
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

export async function createKlaviyoSyncConfig(data: {
  apiKeyEncrypted?: string
  segmentType: 'shopify' | 'rfm'
  segmentId: string
  klaviyoListId: string
  klaviyoListName?: string
  syncDirection: 'push' | 'pull' | 'bidirectional'
}): Promise<KlaviyoSyncConfigRow> {
  const result = await sql<KlaviyoSyncConfigRow>`
    INSERT INTO klaviyo_sync_config (
      api_key_encrypted, api_key_set, segment_type, segment_id,
      klaviyo_list_id, klaviyo_list_name, sync_direction
    )
    VALUES (
      ${data.apiKeyEncrypted || null},
      ${data.apiKeyEncrypted ? true : false},
      ${data.segmentType},
      ${data.segmentId},
      ${data.klaviyoListId},
      ${data.klaviyoListName || null},
      ${data.syncDirection}::klaviyo_sync_direction
    )
    RETURNING id, api_key_encrypted, api_key_set, segment_type, segment_id,
              klaviyo_list_id, klaviyo_list_name, sync_direction,
              last_synced_at, last_sync_count, enabled, created_at, updated_at
  `
  return result.rows[0]!
}

export async function updateKlaviyoSyncConfig(
  id: string,
  data: Partial<{
    apiKeyEncrypted: string | null
    segmentType: 'shopify' | 'rfm'
    segmentId: string
    klaviyoListId: string
    klaviyoListName: string | null
    syncDirection: 'push' | 'pull' | 'bidirectional'
    lastSyncedAt: string | null
    lastSyncCount: number | null
    enabled: boolean
  }>
): Promise<KlaviyoSyncConfigRow | null> {
  const current = await getKlaviyoSyncConfigById(id)
  if (!current) return null

  const apiKeyEncrypted = data.apiKeyEncrypted !== undefined ? data.apiKeyEncrypted : current.api_key_encrypted
  const apiKeySet = apiKeyEncrypted !== null

  const result = await sql<KlaviyoSyncConfigRow>`
    UPDATE klaviyo_sync_config SET
      api_key_encrypted = ${apiKeyEncrypted},
      api_key_set = ${apiKeySet},
      segment_type = ${data.segmentType ?? current.segment_type},
      segment_id = ${data.segmentId ?? current.segment_id},
      klaviyo_list_id = ${data.klaviyoListId ?? current.klaviyo_list_id},
      klaviyo_list_name = ${data.klaviyoListName !== undefined ? data.klaviyoListName : current.klaviyo_list_name},
      sync_direction = ${data.syncDirection ?? current.sync_direction}::klaviyo_sync_direction,
      last_synced_at = ${data.lastSyncedAt !== undefined ? data.lastSyncedAt : current.last_synced_at}::timestamptz,
      last_sync_count = ${data.lastSyncCount !== undefined ? data.lastSyncCount : current.last_sync_count},
      enabled = ${data.enabled !== undefined ? data.enabled : current.enabled},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, api_key_encrypted, api_key_set, segment_type, segment_id,
              klaviyo_list_id, klaviyo_list_name, sync_direction,
              last_synced_at, last_sync_count, enabled, created_at, updated_at
  `
  return result.rows[0] || null
}

export async function deleteKlaviyoSyncConfig(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM klaviyo_sync_config WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// ============================================================================
// RFM Calculation Helpers
// ============================================================================

interface OrderAggregateRow {
  customer_id: string
  customer_email: string | null
  customer_name: string | null
  order_count: string
  total_spent_cents: string
  first_order_at: string
  last_order_at: string
  days_since_last: string
}

export async function getCustomerOrderAggregates(daysBack: number = 365): Promise<OrderAggregateRow[]> {
  const result = await sql<OrderAggregateRow>`
    SELECT
      customer_id,
      MIN(email) as customer_email,
      MIN(customer_name) as customer_name,
      COUNT(*)::text as order_count,
      SUM(total_price_cents)::text as total_spent_cents,
      MIN(order_placed_at)::text as first_order_at,
      MAX(order_placed_at)::text as last_order_at,
      EXTRACT(DAY FROM NOW() - MAX(order_placed_at))::text as days_since_last
    FROM orders
    WHERE order_placed_at >= NOW() - INTERVAL '1 day' * ${daysBack}
      AND customer_id IS NOT NULL
    GROUP BY customer_id
    HAVING COUNT(*) > 0
  `
  return result.rows
}

export function calculateRfmScores(
  aggregates: OrderAggregateRow[]
): Array<{
  customerId: string
  customerEmail: string | null
  customerName: string | null
  rScore: number
  fScore: number
  mScore: number
  recencyDays: number
  frequencyCount: number
  monetaryTotalCents: number
  firstOrderAt: string
  lastOrderAt: string
}> {
  if (aggregates.length === 0) return []

  // Calculate percentiles for each metric
  const recencies = aggregates.map((a) => Number(a.days_since_last))
  const frequencies = aggregates.map((a) => Number(a.order_count))
  const monetaries = aggregates.map((a) => Number(a.total_spent_cents))

  // Sort for percentile calculation
  const sortedRecencies = [...recencies].sort((a, b) => a - b)
  const sortedFrequencies = [...frequencies].sort((a, b) => a - b)
  const sortedMonetaries = [...monetaries].sort((a, b) => a - b)

  // Get quintile boundaries
  const getQuintiles = (sorted: number[]) => {
    const n = sorted.length
    return [
      sorted[Math.floor(n * 0.2)] ?? 0,
      sorted[Math.floor(n * 0.4)] ?? 0,
      sorted[Math.floor(n * 0.6)] ?? 0,
      sorted[Math.floor(n * 0.8)] ?? 0,
    ]
  }

  const recencyQuintiles = getQuintiles(sortedRecencies)
  const frequencyQuintiles = getQuintiles(sortedFrequencies)
  const monetaryQuintiles = getQuintiles(sortedMonetaries)

  // Score function - for recency, lower is better (invert the score)
  const getScore = (value: number, quintiles: number[], invert: boolean = false): number => {
    let score: number
    if (value <= quintiles[0]!) {
      score = 1
    } else if (value <= quintiles[1]!) {
      score = 2
    } else if (value <= quintiles[2]!) {
      score = 3
    } else if (value <= quintiles[3]!) {
      score = 4
    } else {
      score = 5
    }
    return invert ? 6 - score : score
  }

  return aggregates.map((agg) => {
    const recencyDays = Number(agg.days_since_last)
    const frequencyCount = Number(agg.order_count)
    const monetaryTotalCents = Number(agg.total_spent_cents)

    return {
      customerId: agg.customer_id,
      customerEmail: agg.customer_email,
      customerName: agg.customer_name,
      rScore: getScore(recencyDays, recencyQuintiles, true), // Lower recency = higher score
      fScore: getScore(frequencyCount, frequencyQuintiles, false),
      mScore: getScore(monetaryTotalCents, monetaryQuintiles, false),
      recencyDays,
      frequencyCount,
      monetaryTotalCents,
      firstOrderAt: agg.first_order_at,
      lastOrderAt: agg.last_order_at,
    }
  })
}
