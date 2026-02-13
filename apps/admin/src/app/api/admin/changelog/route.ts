/**
 * Changelog API Routes
 * GET: Fetch changelog entries with filtering and stats
 */

import { getTenantContext } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'

import { getChangelog, getChangelogStats } from '@/lib/admin-utilities/db'
import type { ChangeSource } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') as ChangeSource | null
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const includeStats = searchParams.get('stats') === 'true'

  const limit = limitParam ? parseInt(limitParam, 10) : 50
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  try {
    const entries = await getChangelog(tenantId, {
      source: source || undefined,
      limit,
      offset,
    })

    const response: {
      entries: typeof entries
      stats?: Awaited<ReturnType<typeof getChangelogStats>>
    } = { entries }

    if (includeStats) {
      response.stats = await getChangelogStats(tenantId)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch changelog:', error)
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 })
  }
}
