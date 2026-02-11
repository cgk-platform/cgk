export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { approveCommissions } from '@/lib/creators-admin-ops'

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
    const { commissionIds } = body as { commissionIds: string[] }

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'commissionIds array is required' },
        { status: 400 }
      )
    }

    const approved = await approveCommissions(tenantSlug, commissionIds, userId)

    return NextResponse.json({ success: true, approved })
  } catch (error) {
    console.error('Error approving commissions:', error)
    return NextResponse.json(
      { error: 'Failed to approve commissions' },
      { status: 500 }
    )
  }
}
