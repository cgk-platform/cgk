/**
 * E-Signature Bulk Send Detail API
 *
 * GET /api/admin/esign/bulk-send/[id] - Get bulk send details
 * POST /api/admin/esign/bulk-send/[id]/cancel - Cancel bulk send
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { getBulkSendWithRecipients, cancelBulkSend } from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const result = await getBulkSendWithRecipients(auth.tenantId, id)

    if (!result) {
      return NextResponse.json({ error: 'Bulk send not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bulk send:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bulk send' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'cancel') {
      const success = await cancelBulkSend(auth.tenantId, id)

      if (!success) {
        return NextResponse.json(
          { error: 'Bulk send cannot be cancelled (may already be completed or cancelled)' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Error with bulk send action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
