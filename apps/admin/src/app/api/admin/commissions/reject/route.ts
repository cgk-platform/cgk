export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { rejectCommissions } from '@/lib/creators-admin-ops'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { commissionIds, reason } = body as {
      commissionIds: string[]
      reason: string
    }

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'commissionIds array is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    const rejected = await rejectCommissions(
      tenantSlug,
      commissionIds,
      reason,
      userId
    )

    return NextResponse.json({ success: true, rejected })
  } catch (error) {
    console.error('Error rejecting commissions:', error)
    return NextResponse.json(
      { error: 'Failed to reject commissions' },
      { status: 500 }
    )
  }
}
