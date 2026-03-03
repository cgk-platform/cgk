import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { ClipLibraryClient } from './clip-library-client'

export default async function ClipLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Suspense fallback={<ClipLibraryLoadingSkeleton />}>
        <ClipLibraryContent params={params} />
      </Suspense>
    </div>
  )
}

async function ClipLibraryContent({
  params,
}: {
  params: Record<string, string | string[] | undefined>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No tenant configured.</p>
      </div>
    )
  }

  const search = (params.search as string) || ''
  const sourceFilter = (params.source as string) || ''
  const page = Math.max(1, parseInt((params.page as string) || '1', 10))
  const limit = 30
  const offset = (page - 1) * limit

  const clips = await withTenant(tenantSlug, async () => {
    if (search && sourceFilter) {
      const result = await sql`
        SELECT a.*,
          COUNT(s.id) AS segment_count,
          AVG(s.quality_score) AS avg_quality
        FROM dam_assets a
        LEFT JOIN dam_clip_segments s ON s.asset_id = a.id AND s.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantSlug}
          AND a.asset_type = 'video'
          AND a.title ILIKE ${'%' + search + '%'}
          AND a.clip_source_type = ${sourceFilter}
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    } else if (search) {
      const result = await sql`
        SELECT a.*,
          COUNT(s.id) AS segment_count,
          AVG(s.quality_score) AS avg_quality
        FROM dam_assets a
        LEFT JOIN dam_clip_segments s ON s.asset_id = a.id AND s.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantSlug}
          AND a.asset_type = 'video'
          AND a.title ILIKE ${'%' + search + '%'}
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    } else if (sourceFilter) {
      const result = await sql`
        SELECT a.*,
          COUNT(s.id) AS segment_count,
          AVG(s.quality_score) AS avg_quality
        FROM dam_assets a
        LEFT JOIN dam_clip_segments s ON s.asset_id = a.id AND s.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantSlug}
          AND a.asset_type = 'video'
          AND a.clip_source_type = ${sourceFilter}
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    } else {
      const result = await sql`
        SELECT a.*,
          COUNT(s.id) AS segment_count,
          AVG(s.quality_score) AS avg_quality
        FROM dam_assets a
        LEFT JOIN dam_clip_segments s ON s.asset_id = a.id AND s.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantSlug}
          AND a.asset_type = 'video'
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return result.rows
    }
  })

  // Count total clips (reuse same filter branches)
  const totalCount = await withTenant(tenantSlug, async () => {
    if (search && sourceFilter) {
      const result = await sql`
        SELECT COUNT(DISTINCT a.id) AS total FROM dam_assets a
        WHERE a.tenant_id = ${tenantSlug} AND a.asset_type = 'video'
          AND a.title ILIKE ${'%' + search + '%'} AND a.clip_source_type = ${sourceFilter}
      `
      return parseInt(((result.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0', 10)
    } else if (search) {
      const result = await sql`
        SELECT COUNT(*) AS total FROM dam_assets
        WHERE tenant_id = ${tenantSlug} AND asset_type = 'video'
          AND title ILIKE ${'%' + search + '%'}
      `
      return parseInt(((result.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0', 10)
    } else if (sourceFilter) {
      const result = await sql`
        SELECT COUNT(*) AS total FROM dam_assets
        WHERE tenant_id = ${tenantSlug} AND asset_type = 'video'
          AND clip_source_type = ${sourceFilter}
      `
      return parseInt(((result.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0', 10)
    } else {
      const result = await sql`
        SELECT COUNT(*) AS total FROM dam_assets
        WHERE tenant_id = ${tenantSlug} AND asset_type = 'video'
      `
      return parseInt(((result.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0', 10)
    }
  })

  return (
    <ClipLibraryClient
      clips={clips as ClipRow[]}
      search={search}
      sourceFilter={sourceFilter}
      page={page}
      totalCount={totalCount}
      pageSize={limit}
    />
  )
}

interface ClipRow {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  mux_playback_id: string | null
  duration_seconds: number | null
  clip_source_type: string | null
  has_burned_captions: boolean
  segment_count: string | null
  avg_quality: string | null
  created_at: string
}

function ClipLibraryLoadingSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="space-y-2">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-72 animate-pulse rounded-md bg-slate-800" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-slate-800" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="aspect-video animate-pulse bg-slate-800" />
              <div className="space-y-1.5 p-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
