/**
 * SEO Redirect Manager
 * CRUD operations, loop detection, and CSV import/export
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type {
  SEORedirect,
  RedirectFilters,
  CreateRedirectInput,
  UpdateRedirectInput,
  RedirectCSVRow,
  RedirectStats,
} from './types'

const REDIRECT_SORT_COLUMNS: Record<string, string> = {
  source: 'source',
  destination: 'destination',
  hits: 'hits',
  created_at: 'created_at',
  updated_at: 'updated_at',
  last_hit_at: 'last_hit_at',
}

/**
 * Normalize a source path for consistency
 */
export function normalizeSource(source: string): string {
  let normalized = source.trim()

  // Remove query strings
  normalized = normalized.replace(/\?.*$/, '')

  // Remove trailing slashes (except for root)
  if (normalized !== '/') {
    normalized = normalized.replace(/\/+$/, '')
  }

  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }

  // Remove multiple slashes
  normalized = normalized.replace(/\/+/g, '/')

  return normalized
}

/**
 * Get redirects with filtering and pagination
 */
export async function getRedirects(
  filters: RedirectFilters
): Promise<{ rows: SEORedirect[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(source ILIKE $${paramIndex} OR destination ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = REDIRECT_SORT_COLUMNS[filters.sort] || 'created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, source, destination, status_code, note,
            hits, last_hit_at, created_at, updated_at
     FROM seo_redirects
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM seo_redirects ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as SEORedirect[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

/**
 * Get all redirects (for export and middleware)
 */
export async function getAllRedirects(): Promise<SEORedirect[]> {
  const result = await sql<SEORedirect>`
    SELECT id, source, destination, status_code, note,
           hits, last_hit_at, created_at, updated_at
    FROM seo_redirects
    ORDER BY source ASC
  `
  return result.rows
}

/**
 * Get a single redirect by ID
 */
export async function getRedirectById(id: string): Promise<SEORedirect | null> {
  const result = await sql<SEORedirect>`
    SELECT id, source, destination, status_code, note,
           hits, last_hit_at, created_at, updated_at
    FROM seo_redirects
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

/**
 * Get redirect by source path
 */
export async function getRedirectBySource(source: string): Promise<SEORedirect | null> {
  const normalized = normalizeSource(source)
  const result = await sql<SEORedirect>`
    SELECT id, source, destination, status_code, note,
           hits, last_hit_at, created_at, updated_at
    FROM seo_redirects
    WHERE source = ${normalized}
  `
  return result.rows[0] || null
}

/**
 * Get redirect destination for a path
 */
export async function getRedirectDestination(source: string): Promise<string | null> {
  const redirect = await getRedirectBySource(source)
  return redirect?.destination ?? null
}

/**
 * Detect if adding a redirect would create a loop
 */
export async function detectRedirectLoop(
  source: string,
  destination: string,
  maxDepth: number = 10
): Promise<{ hasLoop: boolean; chain: string[] }> {
  const normalizedSource = normalizeSource(source)
  const visited = new Set<string>([normalizedSource])
  const chain = [normalizedSource, destination]

  let current = destination

  for (let i = 0; i < maxDepth; i++) {
    // Check if we've seen this path before
    if (visited.has(current)) {
      return { hasLoop: true, chain }
    }
    visited.add(current)

    // Look for the next redirect in the chain
    const next = await getRedirectDestination(current)
    if (!next) break

    chain.push(next)
    current = next
  }

  return { hasLoop: false, chain }
}

/**
 * Create a new redirect
 */
export async function createRedirect(input: CreateRedirectInput): Promise<SEORedirect> {
  const normalizedSource = normalizeSource(input.source)
  const statusCode = input.status_code ?? 301

  // Check for existing redirect
  const existing = await getRedirectBySource(normalizedSource)
  if (existing) {
    throw new Error(`Redirect already exists for source: ${normalizedSource}`)
  }

  // Check for loops
  const { hasLoop, chain } = await detectRedirectLoop(normalizedSource, input.destination)
  if (hasLoop) {
    throw new Error(`Redirect would create a loop: ${chain.join(' -> ')}`)
  }

  const result = await sql<SEORedirect>`
    INSERT INTO seo_redirects (source, destination, status_code, note)
    VALUES (
      ${normalizedSource},
      ${input.destination},
      ${statusCode},
      ${input.note || null}
    )
    RETURNING id, source, destination, status_code, note,
              hits, last_hit_at, created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update a redirect
 */
export async function updateRedirect(input: UpdateRedirectInput): Promise<SEORedirect | null> {
  const current = await getRedirectById(input.id)
  if (!current) return null

  const source = input.source ? normalizeSource(input.source) : current.source
  const destination = input.destination ?? current.destination
  const statusCode = input.status_code ?? current.status_code
  const note = input.note !== undefined ? input.note : current.note

  // If source changed, check for duplicate
  if (source !== current.source) {
    const existing = await getRedirectBySource(source)
    if (existing && existing.id !== input.id) {
      throw new Error(`Redirect already exists for source: ${source}`)
    }
  }

  // Check for loops
  const { hasLoop, chain } = await detectRedirectLoop(source, destination)
  if (hasLoop) {
    throw new Error(`Redirect would create a loop: ${chain.join(' -> ')}`)
  }

  const result = await sql<SEORedirect>`
    UPDATE seo_redirects SET
      source = ${source},
      destination = ${destination},
      status_code = ${statusCode},
      note = ${note},
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, source, destination, status_code, note,
              hits, last_hit_at, created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Delete a redirect
 */
export async function deleteRedirect(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM seo_redirects WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

/**
 * Record a redirect hit
 */
export async function recordRedirectHit(source: string): Promise<void> {
  const normalized = normalizeSource(source)
  await sql`
    UPDATE seo_redirects SET
      hits = hits + 1,
      last_hit_at = NOW()
    WHERE source = ${normalized}
  `
}

/**
 * Import redirects from CSV data
 */
export async function importRedirectsFromCSV(
  rows: RedirectCSVRow[]
): Promise<{ imported: number; errors: Array<{ row: number; error: string }> }> {
  let imported = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    try {
      const statusCode = row.status_code || 301
      if (![301, 302, 307, 308].includes(statusCode)) {
        throw new Error(`Invalid status code: ${statusCode}`)
      }

      await createRedirect({
        source: row.source,
        destination: row.destination,
        status_code: statusCode,
        note: row.note || undefined,
      })
      imported++
    } catch (err) {
      errors.push({
        row: i + 1,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { imported, errors }
}

/**
 * Export redirects to CSV format
 */
export async function exportRedirectsToCSV(): Promise<string> {
  const redirects = await getAllRedirects()

  const headers = ['source', 'destination', 'status_code', 'note', 'hits', 'last_hit_at']
  const rows = redirects.map((r) => [
    r.source,
    r.destination,
    r.status_code.toString(),
    r.note || '',
    r.hits.toString(),
    r.last_hit_at || '',
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

/**
 * Parse CSV content into redirect rows
 */
export function parseRedirectCSV(csvContent: string): RedirectCSVRow[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  // Skip header row
  return lines.slice(1).map((line) => {
    const parts = line.split(',').map((p) => p.trim())
    return {
      source: parts[0] || '',
      destination: parts[1] || '',
      status_code: parseInt(parts[2] || '301', 10),
      note: parts[3] || '',
    }
  })
}

/**
 * Get redirect stats for dashboard
 */
export async function getRedirectStats(): Promise<RedirectStats> {
  const totalResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count FROM seo_redirects
  `

  const hitsResult = await sql<{ total_hits: number }>`
    SELECT COALESCE(SUM(hits), 0) as total_hits FROM seo_redirects
  `

  const mostUsedResult = await sql<SEORedirect>`
    SELECT id, source, destination, status_code, note,
           hits, last_hit_at, created_at, updated_at
    FROM seo_redirects
    WHERE hits > 0
    ORDER BY hits DESC
    LIMIT 5
  `

  const recentResult = await sql<SEORedirect>`
    SELECT id, source, destination, status_code, note,
           hits, last_hit_at, created_at, updated_at
    FROM seo_redirects
    ORDER BY created_at DESC
    LIMIT 5
  `

  const neverUsedResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM seo_redirects
    WHERE hits = 0
  `

  return {
    totalRedirects: Number(totalResult.rows[0]?.count || 0),
    totalHits: Number(hitsResult.rows[0]?.total_hits || 0),
    mostUsed: mostUsedResult.rows,
    recentlyAdded: recentResult.rows,
    neverUsedCount: Number(neverUsedResult.rows[0]?.count || 0),
  }
}

/**
 * Delete redirects that have never been used
 */
export async function deleteUnusedRedirects(): Promise<number> {
  const result = await sql`
    DELETE FROM seo_redirects
    WHERE hits = 0
      AND created_at < NOW() - INTERVAL '30 days'
  `
  return result.rowCount ?? 0
}

/**
 * Find all redirect chains (for optimization)
 */
export async function findRedirectChains(): Promise<
  Array<{ chain: string[]; length: number }>
> {
  const redirects = await getAllRedirects()
  const chains: Array<{ chain: string[]; length: number }> = []

  for (const redirect of redirects) {
    const visited = new Set<string>([redirect.source])
    const chain = [redirect.source]
    let current = redirect.destination

    while (current && !visited.has(current)) {
      chain.push(current)
      visited.add(current)

      const next = await getRedirectDestination(current)
      if (!next) break
      current = next
    }

    if (chain.length > 2) {
      chains.push({ chain, length: chain.length })
    }
  }

  return chains.sort((a, b) => b.length - a.length)
}
