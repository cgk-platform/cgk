/**
 * Public Privacy Request Status API
 *
 * GET /api/support/privacy/[requestId] - Get request status
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for checking request status
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  getDaysUntilDeadline,
  getPrivacyRequest,
  isRequestOverdue,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    // Return simplified public view
    return NextResponse.json({
      id: request.id,
      requestType: request.requestType,
      status: request.status,
      createdAt: request.createdAt,
      deadlineAt: request.deadlineAt,
      daysUntilDeadline: getDaysUntilDeadline(request),
      isOverdue: isRequestOverdue(request),
      isVerified: request.verifiedAt !== null,
      isComplete: request.status === 'completed',
      resultUrl: request.status === 'completed' ? request.resultUrl : null,
    })
  } catch (error) {
    console.error('[support/privacy/request] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch request' },
      { status: 500 }
    )
  }
}
