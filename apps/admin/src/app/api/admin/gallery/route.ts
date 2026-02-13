/**
 * Gallery API Routes
 * GET: Fetch UGC submissions with stats
 */

import { getTenantContext } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'

import { getUGCGalleryStats, getUGCSubmissions } from '@/lib/admin-utilities/db'
import type { UGCSubmissionStatus } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status') as UGCSubmissionStatus | 'all' | null
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const status = statusParam || 'all'
  const limit = limitParam ? parseInt(limitParam, 10) : 50
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  try {
    const [submissions, stats] = await Promise.all([
      getUGCSubmissions(tenantId, { status, limit, offset }),
      getUGCGalleryStats(tenantId),
    ])

    return NextResponse.json({ submissions, stats })
  } catch (error) {
    console.error('Failed to fetch gallery submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallery submissions' },
      { status: 500 }
    )
  }
}
