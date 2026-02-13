/**
 * Public Privacy Request API
 *
 * POST /api/support/privacy - Submit a privacy request
 * GET /api/support/privacy - Get request status by email
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for customer privacy requests
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  createPrivacyRequest,
  getDaysUntilDeadline,
  getPrivacyRequests,
  isRequestOverdue,
  type CreatePrivacyRequestInput,
  type PrivacyRequestType,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_TYPES: PrivacyRequestType[] = ['export', 'delete', 'do_not_sell', 'disclosure']

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const email = req.nextUrl.searchParams.get('email')
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const { requests } = await getPrivacyRequests(tenantId, {
      customerEmail: email,
      limit: 10,
    })

    // Return simplified view for public access
    const publicRequests = requests.map((r) => ({
      id: r.id,
      requestType: r.requestType,
      status: r.status,
      createdAt: r.createdAt,
      deadlineAt: r.deadlineAt,
      daysUntilDeadline: getDaysUntilDeadline(r),
      isOverdue: isRequestOverdue(r),
      resultUrl: r.status === 'completed' ? r.resultUrl : null,
    }))

    return NextResponse.json({ requests: publicRequests })
  } catch (error) {
    console.error('[support/privacy] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await req.json() as CreatePrivacyRequestInput

    if (!body.customerEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!body.requestType || !VALID_TYPES.includes(body.requestType)) {
      return NextResponse.json(
        { error: 'Valid request type is required (export, delete, do_not_sell, disclosure)' },
        { status: 400 }
      )
    }

    // Check for existing pending requests of the same type
    const { requests: existingRequests } = await getPrivacyRequests(tenantId, {
      customerEmail: body.customerEmail,
      requestType: body.requestType,
      status: 'pending',
      limit: 1,
    })

    if (existingRequests.length > 0) {
      return NextResponse.json(
        { error: 'A pending request of this type already exists for this email' },
        { status: 409 }
      )
    }

    const request = await createPrivacyRequest(tenantId, body)

    return NextResponse.json({
      request: {
        id: request.id,
        requestType: request.requestType,
        status: request.status,
        deadlineAt: request.deadlineAt,
        createdAt: request.createdAt,
      },
      message: 'Your privacy request has been submitted. We will process it within the required timeframe.',
    }, { status: 201 })
  } catch (error) {
    console.error('[support/privacy] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create request' },
      { status: 500 }
    )
  }
}
