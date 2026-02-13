/**
 * Payment Request API
 *
 * GET  /api/contractor/payments/request - List payment requests
 * POST /api/contractor/payments/request - Submit new payment request
 */

import {
  createPaymentRequest,
  getPaymentRequests,
  PaymentRequestError,
  type PaymentRequestStatus,
  type WorkType,
} from '@cgk-platform/payments'

import {
  requireContractorAuth,
  unauthorizedResponse,
} from '@/lib/auth/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const status = url.searchParams.get('status') as PaymentRequestStatus | null

  try {
    const result = await getPaymentRequests(
      auth.contractorId,
      auth.tenantSlug,
      {
        limit: Math.min(limit, 100),
        offset,
        status: status || undefined,
      }
    )

    return Response.json({
      requests: result.requests.map((r) => ({
        id: r.id,
        amountCents: r.amountCents,
        description: r.description,
        workType: r.workType,
        projectId: r.projectId,
        attachments: r.attachments,
        status: r.status,
        adminNotes: r.adminNotes,
        approvedAmountCents: r.approvedAmountCents,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() || null,
        paidAt: r.paidAt?.toISOString() || null,
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching payment requests:', error)
    return Response.json(
      { error: 'Failed to fetch payment requests' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  let auth
  try {
    auth = await requireContractorAuth(req)
  } catch {
    return unauthorizedResponse()
  }

  let body: {
    amountCents: number
    description: string
    workType: WorkType
    projectId?: string
    attachmentIds?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.amountCents || typeof body.amountCents !== 'number') {
    return Response.json({ error: 'Amount is required' }, { status: 400 })
  }

  if (!body.description || typeof body.description !== 'string') {
    return Response.json({ error: 'Description is required' }, { status: 400 })
  }

  if (!body.workType) {
    return Response.json({ error: 'Work type is required' }, { status: 400 })
  }

  try {
    const request = await createPaymentRequest(
      auth.contractorId,
      auth.tenantId,
      auth.tenantSlug,
      {
        amountCents: body.amountCents,
        description: body.description,
        workType: body.workType,
        projectId: body.projectId,
        attachmentIds: body.attachmentIds,
      }
    )

    return Response.json({
      success: true,
      request: {
        id: request.id,
        amountCents: request.amountCents,
        description: request.description,
        workType: request.workType,
        projectId: request.projectId,
        attachments: request.attachments,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof PaymentRequestError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }
    console.error('Error creating payment request:', error)
    return Response.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    )
  }
}
