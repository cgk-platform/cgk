/**
 * E-Signature Webhook Test API
 *
 * POST /api/admin/esign/webhooks/[id]/test - Test a webhook
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { testWebhook } from '@/lib/esign'

export const dynamic = 'force-dynamic'

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
    const result = await testWebhook(auth.tenantId, id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    )
  }
}
