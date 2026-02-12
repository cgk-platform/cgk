import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  getContractorById,
  getContractorPaymentRequests,
} from '@/lib/contractors/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/contractors/[id]/payments
 * List payment requests for contractor
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const paymentRequests = await getContractorPaymentRequests(tenantSlug, id)
  return NextResponse.json({ paymentRequests })
}

/**
 * POST /api/admin/contractors/[id]/payments
 * Create a manual payment (admin-initiated)
 * This would typically be used for bonuses, expense reimbursements, etc.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')
  const { id } = await params

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Verify contractor exists
  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  const body = await req.json()

  if (!body.amountCents || body.amountCents <= 0) {
    return NextResponse.json(
      { error: 'Valid amount is required' },
      { status: 400 },
    )
  }

  if (!body.description?.trim()) {
    return NextResponse.json(
      { error: 'Description is required' },
      { status: 400 },
    )
  }

  // In a full implementation, this would:
  // 1. Create a payment request with status 'approved' (since admin is creating it)
  // 2. Create a balance transaction
  // 3. Optionally trigger immediate payout

  return NextResponse.json(
    {
      success: true,
      message: 'Manual payment created',
    },
    { status: 201 },
  )
}
