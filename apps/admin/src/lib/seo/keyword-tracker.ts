/**
 * SEO Keyword Tracker
 * CRUD operations and trend analysis for tracked keywords
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  SEOKeyword,
  SEOKeywordWithTrend,
  KeywordHistory,
  KeywordFilters,
  CreateKeywordInput,
  UpdateKeywordInput,
  TrendStatus,
  KeywordStats,
} from './types'

const KEYWORD_SORT_COLUMNS: Record<string, string> = {
  keyword: 'k.keyword',
  priority: 'k.priority',
  position: 'k.current_position',
  clicks: 'k.clicks',
  impressions: 'k.impressions',
  created_at: 'k.created_at',
  updated_at: 'k.updated_at',
}

/**
 * Get keywords with filtering and pagination
 */
export async function getKeywords(
  filters: KeywordFilters
): Promise<{ rows: SEOKeyword[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`k.keyword ILIKE $${paramIndex}`)
    values.push(`%${filters.search}%`)
  }

  if (filters.priority) {
    paramIndex++
    conditions.push(`k.priority = $${paramIndex}::seo_keyword_priority`)
    values.push(filters.priority)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = KEYWORD_SORT_COLUMNS[filters.sort] || 'k.created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT k.id, k.keyword, k.priority, k.target_url, k.current_position,
            k.clicks, k.impressions, k.ctr, k.linked_post_ids,
            k.last_synced_at, k.created_at, k.updated_at
     FROM seo_keywords k
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM seo_keywords k ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as SEOKeyword[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get a single keyword by ID
 */
export async function getKeywordById(id: string): Promise<SEOKeyword | null> {
  const result = await sql<SEOKeyword>`
    SELECT id, keyword, priority, target_url, current_position,
           clicks, impressions, ctr, linked_post_ids,
           last_synced_at, created_at, updated_at
    FROM seo_keywords
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

/**
 * Get a keyword by keyword text
 */
export async function getKeywordByText(keyword: string): Promise<SEOKeyword | null> {
  const result = await sql<SEOKeyword>`
    SELECT id, keyword, priority, target_url, current_position,
           clicks, impressions, ctr, linked_post_ids,
           last_synced_at, created_at, updated_at
    FROM seo_keywords
    WHERE keyword = ${keyword}
  `
  return result.rows[0] || null
}

/**
 * Create a new keyword
 */
export async function createKeyword(input: CreateKeywordInput): Promise<SEOKeyword> {
  const linkedPostIds = input.linked_post_ids || []

  const result = await sql<SEOKeyword>`
    INSERT INTO seo_keywords (keyword, priority, target_url, linked_post_ids)
    VALUES (
      ${input.keyword},
      ${input.priority || 'medium'}::seo_keyword_priority,
      ${input.target_url || null},
      ${JSON.stringify(linkedPostIds)}::jsonb
    )
    RETURNING id, keyword, priority, target_url, current_position,
              clicks, impressions, ctr, linked_post_ids,
              last_synced_at, created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update a keyword
 */
export async function updateKeyword(input: UpdateKeywordInput): Promise<SEOKeyword | null> {
  const current = await getKeywordById(input.id)
  if (!current) return null

  const priority = input.priority ?? current.priority
  const targetUrl = input.target_url !== undefined ? input.target_url : current.target_url
  const linkedPostIds = input.linked_post_ids ?? current.linked_post_ids

  const result = await sql<SEOKeyword>`
    UPDATE seo_keywords SET
      priority = ${priority}::seo_keyword_priority,
      target_url = ${targetUrl},
      linked_post_ids = ${JSON.stringify(linkedPostIds)}::jsonb,
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, keyword, priority, target_url, current_position,
              clicks, impressions, ctr, linked_post_ids,
              last_synced_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Delete a keyword
 */
export async function deleteKeyword(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM seo_keywords WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

/**
 * Update keyword metrics (called during GSC sync)
 */
export async function updateKeywordMetrics(
  id: string,
  metrics: {
    position: number | null
    clicks: number
    impressions: number
    ctr: number
  }
): Promise<void> {
  await sql`
    UPDATE seo_keywords SET
      current_position = ${metrics.position},
      clicks = ${metrics.clicks},
      impressions = ${metrics.impressions},
      ctr = ${metrics.ctr},
      last_synced_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
  `
}

/**
 * Record a history snapshot for a keyword
 */
export async function recordHistorySnapshot(
  keywordId: string,
  metrics: {
    position: number | null
    clicks: number
    impressions: number
    ctr: number
  }
): Promise<void> {
  await sql`
    INSERT INTO seo_keyword_history (keyword_id, position, clicks, impressions, ctr, recorded_at)
    VALUES (
      ${keywordId},
      ${metrics.position},
      ${metrics.clicks},
      ${metrics.impressions},
      ${metrics.ctr},
      CURRENT_DATE
    )
    ON CONFLICT (keyword_id, recorded_at) DO UPDATE SET
      position = EXCLUDED.position,
      clicks = EXCLUDED.clicks,
      impressions = EXCLUDED.impressions,
      ctr = EXCLUDED.ctr
  `
}

/**
 * Get keyword history for a specified number of days
 */
export async function getKeywordHistory(
  keywordId: string,
  days: number = 90
): Promise<KeywordHistory[]> {
  const result = await sql<KeywordHistory>`
    SELECT id, keyword_id, position, clicks, impressions, ctr, recorded_at
    FROM seo_keyword_history
    WHERE keyword_id = ${keywordId}
      AND recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY recorded_at DESC
  `
  return result.rows
}

/**
 * Clean up old history records (keep 90 days)
 */
export async function cleanupOldHistory(): Promise<number> {
  const result = await sql`
    DELETE FROM seo_keyword_history
    WHERE recorded_at < CURRENT_DATE - INTERVAL '90 days'
  `
  return result.rowCount ?? 0
}

/**
 * Calculate trend status based on position change
 */
function calculateTrendStatus(change: number | null): TrendStatus {
  if (change === null) return 'stable'
  if (change < -1) return 'improving' // Lower position is better
  if (change > 1) return 'declining'
  return 'stable'
}

/**
 * Get position change over a period
 */
async function getPositionChange(
  keywordId: string,
  days: number
): Promise<number | null> {
  const result = await sql<{ old_position: number | null }>`
    SELECT position as old_position
    FROM seo_keyword_history
    WHERE keyword_id = ${keywordId}
      AND recorded_at <= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY recorded_at DESC
    LIMIT 1
  `

  const oldPosition = result.rows[0]?.old_position
  if (oldPosition === null || oldPosition === undefined) return null

  const currentResult = await sql<{ current_position: number | null }>`
    SELECT current_position FROM seo_keywords WHERE id = ${keywordId}
  `
  const currentPosition = currentResult.rows[0]?.current_position
  if (currentPosition === null || currentPosition === undefined) return null

  return currentPosition - oldPosition
}

/**
 * Get keywords with trend data
 */
export async function getKeywordsWithTrends(
  filters: KeywordFilters
): Promise<{ rows: SEOKeywordWithTrend[]; totalCount: number }> {
  const { rows, totalCount } = await getKeywords(filters)

  const keywordsWithTrends: SEOKeywordWithTrend[] = await Promise.all(
    rows.map(async (keyword) => {
      const [change7d, change30d, change90d] = await Promise.all([
        getPositionChange(keyword.id, 7),
        getPositionChange(keyword.id, 30),
        getPositionChange(keyword.id, 90),
      ])

      return {
        ...keyword,
        trend_7d: calculateTrendStatus(change7d),
        trend_30d: calculateTrendStatus(change30d),
        trend_90d: calculateTrendStatus(change90d),
        position_change_7d: change7d,
        position_change_30d: change30d,
        position_change_90d: change90d,
      }
    })
  )

  return { rows: keywordsWithTrends, totalCount }
}

/**
 * Get keyword stats for dashboard
 */
export async function getKeywordStats(): Promise<KeywordStats> {
  const totalResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count FROM seo_keywords
  `

  const avgResult = await sql<{ avg_position: number | null }>`
    SELECT AVG(current_position) as avg_position
    FROM seo_keywords
    WHERE current_position IS NOT NULL
  `

  const totalsResult = await sql<{ total_clicks: number; total_impressions: number }>`
    SELECT
      COALESCE(SUM(clicks), 0) as total_clicks,
      COALESCE(SUM(impressions), 0) as total_impressions
    FROM seo_keywords
  `

  const topResult = await sql<SEOKeyword>`
    SELECT id, keyword, priority, target_url, current_position,
           clicks, impressions, ctr, linked_post_ids,
           last_synced_at, created_at, updated_at
    FROM seo_keywords
    WHERE current_position IS NOT NULL
    ORDER BY current_position ASC
    LIMIT 10
  `

  // Calculate trends for top keywords
  const topKeywordsWithTrends: SEOKeywordWithTrend[] = await Promise.all(
    topResult.rows.map(async (keyword) => {
      const [change7d, change30d, change90d] = await Promise.all([
        getPositionChange(keyword.id, 7),
        getPositionChange(keyword.id, 30),
        getPositionChange(keyword.id, 90),
      ])

      return {
        ...keyword,
        trend_7d: calculateTrendStatus(change7d),
        trend_30d: calculateTrendStatus(change30d),
        trend_90d: calculateTrendStatus(change90d),
        position_change_7d: change7d,
        position_change_30d: change30d,
        position_change_90d: change90d,
      }
    })
  )

  // Count improving/declining keywords based on 7d trend
  let improvingCount = 0
  let decliningCount = 0

  for (const kw of topKeywordsWithTrends) {
    if (kw.trend_7d === 'improving') improvingCount++
    if (kw.trend_7d === 'declining') decliningCount++
  }

  return {
    totalKeywords: Number(totalResult.rows[0]?.count || 0),
    avgPosition: avgResult.rows[0]?.avg_position ?? null,
    totalClicks: Number(totalsResult.rows[0]?.total_clicks || 0),
    totalImpressions: Number(totalsResult.rows[0]?.total_impressions || 0),
    topKeywords: topKeywordsWithTrends,
    improvingKeywords: improvingCount,
    decliningKeywords: decliningCount,
  }
}

/**
 * Export keywords to CSV format
 */
export async function exportKeywordsToCSV(): Promise<string> {
  const result = await sql<SEOKeyword>`
    SELECT keyword, priority, target_url, current_position,
           clicks, impressions, ctr
    FROM seo_keywords
    ORDER BY keyword ASC
  `

  const headers = ['keyword', 'priority', 'target_url', 'position', 'clicks', 'impressions', 'ctr']
  const rows = result.rows.map((k) => [
    k.keyword,
    k.priority,
    k.target_url || '',
    k.current_position?.toString() || '',
    k.clicks.toString(),
    k.impressions.toString(),
    k.ctr?.toString() || '',
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

/**
 * Export keyword history to CSV
 */
export async function exportKeywordHistoryToCSV(keywordId: string): Promise<string> {
  const keyword = await getKeywordById(keywordId)
  if (!keyword) throw new Error('Keyword not found')

  const history = await getKeywordHistory(keywordId, 90)

  const headers = ['date', 'keyword', 'position', 'clicks', 'impressions', 'ctr']
  const rows = history.map((h) => [
    h.recorded_at,
    keyword.keyword,
    h.position?.toString() || '',
    h.clicks?.toString() || '',
    h.impressions?.toString() || '',
    h.ctr?.toString() || '',
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
