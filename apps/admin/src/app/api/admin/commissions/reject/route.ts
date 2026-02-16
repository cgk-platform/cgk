export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { rejectCommissions } from '@/lib/creators-admin-ops'

export async function POST(request: Request) {
  // Require authentication
  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and above can reject commissions
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const userId = auth.userId

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
