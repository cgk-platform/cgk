export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { ReturnRequestResponse, ReturnStatus } from '@/lib/account/types'

interface ReturnRow {
  id: string
  status: ReturnStatus
  return_label_url: string | null
  instructions: string | null
  created_at: string
}

interface RouteParams {
  params: Promise<{ id: string; returnId: string }>
}

/**
 * GET /api/account/orders/[id]/returns/[returnId]
 * Get the status of a return request
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: orderId, returnId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get return request
  const result = await withTenant(tenantSlug, async () => {
    return sql<ReturnRow>`
      SELECT
        id,
        status,
        return_label_url,
        instructions,
        created_at
      FROM order_returns
      WHERE id = ${returnId}
        AND order_id = ${orderId}
        AND customer_id = ${session.customerId}
      LIMIT 1
    `
  })

  const returnRequest = result.rows[0]
  if (!returnRequest) {
    return NextResponse.json({ error: 'Return request not found' }, { status: 404 })
  }

  const response: ReturnRequestResponse = {
    id: returnRequest.id,
    status: returnRequest.status,
    returnLabel: returnRequest.return_label_url,
    instructions: returnRequest.instructions ?? getDefaultInstructions(returnRequest.status),
    createdAt: returnRequest.created_at,
  }

  return NextResponse.json(response)
}

function getDefaultInstructions(status: ReturnStatus): string {
  switch (status) {
    case 'pending':
      return 'Your return request is being reviewed. You will receive an email with return instructions within 1-2 business days.'
    case 'approved':
      return 'Your return has been approved. Please print the return label and ship the items within 7 days.'
    case 'rejected':
      return 'Unfortunately, your return request could not be approved. Please contact customer support for more information.'
    case 'shipped':
      return 'We have received notification that your return is on its way. Processing will begin once we receive the items.'
    case 'received':
      return 'Your return has been received and is being processed. Refund will be issued within 3-5 business days.'
    case 'refunded':
      return 'Your refund has been processed. It may take 5-10 business days to appear on your statement.'
    default:
      return 'Please contact customer support for the status of your return.'
  }
}
