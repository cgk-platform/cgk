/**
 * Privacy Requests API
 *
 * GET /api/admin/support/privacy - List privacy requests
 * POST /api/admin/support/privacy - Create a privacy request (admin initiated)
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  createPrivacyRequest,
  getPrivacyRequests,
  getPrivacyStats,
  type CreatePrivacyRequestInput,
  type PrivacyRequestFilters,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_STATUSES: PrivacyRequestStatus[] = ['pending', 'processing', 'completed', 'rejected']
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') as PrivacyRequestStatus | null
    const requestType = searchParams.get('type') as PrivacyRequestType | null
    const customerEmail = searchParams.get('email')
    const overdue = searchParams.get('overdue') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const includeStats = searchParams.get('includeStats') === 'true'

    const filters: PrivacyRequestFilters = {
      limit: Math.min(limit, 100),
      page,
    }

    if (status && VALID_STATUSES.includes(status)) {
      filters.status = status
    }

    if (requestType && VALID_TYPES.includes(requestType)) {
      filters.requestType = requestType
    }

    if (customerEmail) {
      filters.customerEmail = customerEmail
    }

    if (overdue) {
      filters.overdue = true
    }

    if (startDate) {
      filters.dateFrom = new Date(startDate)
    }

    if (endDate) {
      filters.dateTo = new Date(endDate)
    }

    const { requests, total } = await getPrivacyRequests(tenantId, filters)

    let stats = null
    if (includeStats) {
      stats = await getPrivacyStats(tenantId)
    }

    return NextResponse.json({
      requests,
      pagination: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        totalPages: Math.ceil(total / (filters.limit ?? 50)),
      },
      stats,
    })
  } catch (error) {
    console.error('[privacy] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch privacy requests' },
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
        { error: 'Customer email is required' },
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

    const request = await createPrivacyRequest(tenantId, body)

    return NextResponse.json({ request }, { status: 201 })
  } catch (error) {
    console.error('[privacy] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create privacy request' },
      { status: 500 }
    )
  }
}
