export const dynamic = 'force-dynamic'

import { requireAuth } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTaskStats } from '@/lib/productivity'

/**
 * GET /api/admin/productivity/tasks/stats
 * Get task statistics
 */
export async function GET(request: Request) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getTaskStats(tenantSlug)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching task stats:', error)
    return NextResponse.json({ error: 'Failed to fetch task statistics' }, { status: 500 })
  }
}
