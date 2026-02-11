/**
 * Privacy Request Detail API
 *
 * GET /api/admin/support/privacy/[requestId] - Get request details
 * PATCH /api/admin/support/privacy/[requestId] - Update request
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  getDaysUntilDeadline,
  getPrivacyRequest,
  isRequestOverdue,
  updatePrivacyRequest,
  updateRequestStatus,
  type PrivacyRequestStatus,
  type UpdatePrivacyRequestInput,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_STATUSES: PrivacyRequestStatus[] = ['pending', 'processing', 'completed', 'rejected']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { requestId } = await params

    const request = await getPrivacyRequest(tenantId, requestId)

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      request,
      daysUntilDeadline: getDaysUntilDeadline(request),
      isOverdue: isRequestOverdue(request),
    })
  } catch (error) {
    console.error('[privacy/request] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch request' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    const tenantId = auth.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { requestId } = await params
    const body = await req.json() as UpdatePrivacyRequestInput & { status?: PrivacyRequestStatus }

    // Verify request exists
    const existingRequest = await getPrivacyRequest(tenantId, requestId)
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }

      // Can't reopen completed/rejected requests
      if (
        (existingRequest.status === 'completed' || existingRequest.status === 'rejected') &&
        (body.status === 'pending' || body.status === 'processing')
      ) {
        return NextResponse.json(
          { error: 'Cannot reopen a completed or rejected request' },
          { status: 400 }
        )
      }

      // If rejecting, require rejection reason
      if (body.status === 'rejected' && !body.rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }
    }

    // Update status if provided
    let request = existingRequest
    if (body.status && body.status !== existingRequest.status) {
      request = await updateRequestStatus(tenantId, requestId, body.status, auth.userId) ?? existingRequest
    }

    // Update other fields
    if (body.notes !== undefined || body.rejectionReason !== undefined || body.resultUrl !== undefined) {
      request = await updatePrivacyRequest(tenantId, requestId, {
        notes: body.notes,
        rejectionReason: body.rejectionReason,
        resultUrl: body.resultUrl,
      }) ?? request
    }

    return NextResponse.json({
      request,
      daysUntilDeadline: getDaysUntilDeadline(request),
      isOverdue: isRequestOverdue(request),
    })
  } catch (error) {
    console.error('[privacy/request] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update request' },
      { status: 500 }
    )
  }
}
