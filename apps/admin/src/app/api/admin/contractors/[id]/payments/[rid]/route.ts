import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import {
  approvePaymentRequest,
  getContractorById,
  rejectPaymentRequest,
} from '@/lib/contractors/db'
import type { ApprovePaymentRequest } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string; rid: string }>
}

/**
 * PATCH /api/admin/contractors/[id]/payments/[rid]
 * Approve or reject payment request
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')
  const { id, rid } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const body = (await req.json()) as ApprovePaymentRequest

  if (!body.action || !['approve', 'reject'].includes(body.action)) {
    return NextResponse.json(
      { error: 'Action must be "approve" or "reject"' },
      { status: 400 },
    )
  }

  if (body.action === 'approve') {
    if (!body.approvedAmountCents || body.approvedAmountCents <= 0) {
      return NextResponse.json(
        { error: 'Approved amount must be greater than 0' },
        { status: 400 },
      )
    }

    const request = await approvePaymentRequest(
      tenantSlug,
      rid,
      body.approvedAmountCents,
      body.adminNotes || null,
      userId || 'unknown',
    )

    if (!request) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request approved',
      request,
    })
  } else {
    const request = await rejectPaymentRequest(
      tenantSlug,
      rid,
      body.adminNotes || null,
      userId || 'unknown',
    )

    if (!request) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request rejected',
      request,
    })
  }
}
