export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { withTenant, sql } from '@cgk-platform/db'

/**
 * POST /api/admin/competitor-intelligence/ingest
 * Bulk upsert from CI pipeline (called by ci_store.py via HTTP)
 *
 * GET /api/admin/competitor-intelligence?action=brands
 * GET /api/admin/competitor-intelligence?action=scaling&brand=X&threshold=3
 * GET /api/admin/competitor-intelligence?action=search&q=X&brand=X&limit=10
 */

// Simple API key auth for CI pipeline (machine-to-machine)
function validateApiKey(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const key = authHeader.slice(7)
  const expected = process.env.CI_PIPELINE_API_KEY
  if (!expected) return false
  return key === expected
}

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    brand_dir: string
    brand_display: string
    ad_library_url?: string
    session_ts: string
    assets: Array<{
      url_hash: string
      rank: number
      type: string
      url?: string
    }>
    analyses: Array<{
      asset_hash: string
      analysis_json: Record<string, unknown>
      analysis_summary: string
    }>
    doc_url?: string
    scaling_alerts?: number
    deduped?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.brand_dir || !body.session_ts) {
    return NextResponse.json({ error: 'brand_dir and session_ts required' }, { status: 400 })
  }

  try {
    await withTenant(tenantSlug, async () => {
      const now = new Date().toISOString()

      // Upsert brand
      await sql`
        INSERT INTO ci_brands (dir_name, display_name, ad_library_url, first_analyzed_at, last_analyzed_at)
        VALUES (${body.brand_dir}, ${body.brand_display}, ${body.ad_library_url || null}, ${now}, ${now})
        ON CONFLICT (dir_name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          last_analyzed_at = EXCLUDED.last_analyzed_at,
          ad_library_url = COALESCE(EXCLUDED.ad_library_url, ci_brands.ad_library_url)
      `

      // Record scan
      await sql`
        INSERT INTO ci_scans (brand_dir, session_ts, total_ads, new_ads, deduped, doc_url, scaling_alerts)
        VALUES (${body.brand_dir}, ${body.session_ts}, ${body.assets?.length || 0},
                ${0}, ${body.deduped || 0}, ${body.doc_url || null}, ${body.scaling_alerts || 0})
      `

      // Upsert assets + rank history
      for (const asset of body.assets || []) {
        await sql`
          INSERT INTO ci_assets (url_hash, brand_dir, type, current_rank, first_seen_at, last_seen_at,
                                  source_url_prefix)
          VALUES (${asset.url_hash}, ${body.brand_dir}, ${asset.type || 'image'}, ${asset.rank},
                  ${now}, ${now}, ${asset.url ? asset.url.slice(0, 60) : null})
          ON CONFLICT (url_hash) DO UPDATE SET
            current_rank = EXCLUDED.current_rank,
            last_seen_at = EXCLUDED.last_seen_at,
            source_url_prefix = COALESCE(EXCLUDED.source_url_prefix, ci_assets.source_url_prefix)
        `

        await sql`
          INSERT INTO ci_rank_history (asset_hash, rank, session, recorded_at)
          VALUES (${asset.url_hash}, ${asset.rank}, ${body.session_ts}, ${now})
        `
      }

      // Insert analyses
      for (const analysis of body.analyses || []) {
        if (!analysis.asset_hash) continue
        await sql`
          INSERT INTO ci_analyses (asset_hash, session, analysis_data, analysis_summary)
          VALUES (${analysis.asset_hash}, ${body.session_ts},
                  ${JSON.stringify(analysis.analysis_json)}, ${analysis.analysis_summary})
        `
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ci-ingest] Error:', error)
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'brands'

  try {
    if (action === 'brands') {
      const result = await withTenant(tenantSlug, async () => {
        return sql`
          SELECT b.*,
                 (SELECT COUNT(*) FROM ci_assets WHERE brand_dir = b.dir_name) as asset_count,
                 (SELECT COUNT(*) FROM ci_scans WHERE brand_dir = b.dir_name) as scan_count
          FROM ci_brands b
          ORDER BY b.display_name
        `
      })
      return NextResponse.json({ brands: result.rows })
    }

    if (action === 'scaling') {
      const brand = searchParams.get('brand')
      const threshold = parseInt(searchParams.get('threshold') || '3', 10)
      if (!brand) {
        return NextResponse.json({ error: 'brand parameter required' }, { status: 400 })
      }

      const result = await withTenant(tenantSlug, async () => {
        return sql`
          WITH recent_ranks AS (
            SELECT asset_hash, rank, session, recorded_at,
                   ROW_NUMBER() OVER (PARTITION BY asset_hash ORDER BY recorded_at DESC) as rn
            FROM ci_rank_history
            WHERE asset_hash IN (SELECT url_hash FROM ci_assets WHERE brand_dir = ${brand})
          )
          SELECT r1.asset_hash, r1.rank as current_rank, r2.rank as previous_rank,
                 (r2.rank - r1.rank) as delta,
                 a.type, a.filename, a.first_seen_at
          FROM recent_ranks r1
          JOIN recent_ranks r2 ON r1.asset_hash = r2.asset_hash AND r2.rn = 2
          JOIN ci_assets a ON a.url_hash = r1.asset_hash
          WHERE r1.rn = 1 AND (r2.rank - r1.rank) >= ${threshold}
          ORDER BY delta DESC
        `
      })
      return NextResponse.json({ scaling: result.rows })
    }

    if (action === 'search') {
      const q = searchParams.get('q')
      const brand = searchParams.get('brand')
      const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)
      if (!q) {
        return NextResponse.json({ error: 'q parameter required' }, { status: 400 })
      }

      const tsQuery = q.split(/\s+/).filter(Boolean).join(' & ')

      const result = brand
        ? await withTenant(tenantSlug, async () => {
            return sql`
              SELECT ca.asset_hash, ca.analysis_summary, ca.created_at,
                     a.brand_dir, a.type, a.current_rank,
                     ts_rank(ca.search_vector, to_tsquery('english', ${tsQuery})) as relevance
              FROM ci_analyses ca
              JOIN ci_assets a ON a.url_hash = ca.asset_hash
              WHERE ca.search_vector @@ to_tsquery('english', ${tsQuery})
                AND a.brand_dir = ${brand}
              ORDER BY relevance DESC
              LIMIT ${limit}
            `
          })
        : await withTenant(tenantSlug, async () => {
            return sql`
              SELECT ca.asset_hash, ca.analysis_summary, ca.created_at,
                     a.brand_dir, a.type, a.current_rank,
                     ts_rank(ca.search_vector, to_tsquery('english', ${tsQuery})) as relevance
              FROM ci_analyses ca
              JOIN ci_assets a ON a.url_hash = ca.asset_hash
              WHERE ca.search_vector @@ to_tsquery('english', ${tsQuery})
              ORDER BY relevance DESC
              LIMIT ${limit}
            `
          })

      return NextResponse.json({ results: result.rows })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error(`[ci-${action}] Error:`, error)
    return NextResponse.json({ error: `Failed to process ${action}` }, { status: 500 })
  }
}
