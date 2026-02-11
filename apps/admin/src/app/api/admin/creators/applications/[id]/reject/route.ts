export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { updateApplicationStatus } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
    const body = await request.json()
    const { reason, sendNotification } = body as {
      reason: string
      sendNotification?: boolean
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      )
    }

    await updateApplicationStatus(tenantSlug, id, 'rejected', userId, {
      rejectionReason: reason,
    })

    // TODO: Send rejection email if sendNotification is true

    return NextResponse.json({
      success: true,
      notificationSent: sendNotification || false,
    })
  } catch (error) {
    console.error('Error rejecting application:', error)
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    )
  }
}
