/**
 * E-Signature Stats API
 *
 * GET /api/admin/esign/stats - Get dashboard statistics
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const stats = await getDashboardStats(auth.tenantId, auth.email)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
