export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getActions, getActionStats, approveAction, rejectAction } from '@/lib/bri/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const pendingOnly = url.searchParams.get('pendingOnly') === 'true'

  const [actions, stats] = await Promise.all([
    getActions(tenantSlug, { pendingOnly }),
    getActionStats(tenantSlug),
  ])

  return NextResponse.json({ actions, stats })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { actionId, decision } = body

  if (!actionId || !decision) {
    return NextResponse.json({ error: 'Missing actionId or decision' }, { status: 400 })
  }

  if (decision === 'approve') {
    await approveAction(tenantSlug, actionId, userId)
  } else if (decision === 'reject') {
    await rejectAction(tenantSlug, actionId, userId)
  } else {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
