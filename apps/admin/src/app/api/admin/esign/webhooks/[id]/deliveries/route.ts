/**
 * E-Signature Webhook Deliveries API
 *
 * GET /api/admin/esign/webhooks/[id]/deliveries - Get delivery log
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { getWebhookDeliveries } from '@/lib/esign'

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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const { deliveries, total } = await getWebhookDeliveries(
      auth.tenantId,
      id,
      page,
      limit
    )

    return NextResponse.json({
      deliveries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}
