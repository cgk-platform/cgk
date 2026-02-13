/**
 * Stripe Topups API Routes
 * GET: Fetch top-ups list with stats
 */

import { getTenantContext } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'

import { getStripeTopups, getTopupStats } from '@/lib/admin-utilities/db'
import type { TopupStatus } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status') as TopupStatus | 'all' | null
  const limitParam = searchParams.get('limit')

  const status = statusParam || 'all'
  const limit = limitParam ? parseInt(limitParam, 10) : 50

  try {
    const [topups, stats] = await Promise.all([
      getStripeTopups(tenantId, { status, limit }),
      getTopupStats(tenantId),
    ])

    return NextResponse.json({ topups, stats })
  } catch (error) {
    console.error('Failed to fetch top-ups:', error)
    return NextResponse.json({ error: 'Failed to fetch top-ups' }, { status: 500 })
  }
}
