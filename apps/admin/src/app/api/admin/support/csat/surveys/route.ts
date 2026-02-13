/**
 * CSAT Surveys List API
 *
 * GET /api/admin/support/csat/surveys - List surveys with filters
 * POST /api/admin/support/csat/surveys - Create a manual survey
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  createSurvey,
  getSurveys,
  type CreateSurveyInput,
  type CSATChannel,
  type CSATRating,
  type CSATSurveyFilters,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_CHANNELS: CSATChannel[] = ['email', 'sms', 'in_app']

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
    const ticketId = searchParams.get('ticketId')
    const agentId = searchParams.get('agentId')
    const customerEmail = searchParams.get('customerEmail')
    const channel = searchParams.get('channel') as CSATChannel | null
    const hasResponse = searchParams.get('hasResponse')
    const rating = searchParams.get('rating')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const filters: CSATSurveyFilters = {
      limit: Math.min(limit, 100),
      page,
    }

    if (ticketId) {
      filters.ticketId = ticketId
    }

    if (agentId) {
      filters.agentId = agentId
    }

    if (customerEmail) {
      filters.customerEmail = customerEmail
    }

    if (channel && VALID_CHANNELS.includes(channel)) {
      filters.channel = channel
    }

    if (hasResponse === 'true') {
      filters.hasResponse = true
    } else if (hasResponse === 'false') {
      filters.hasResponse = false
    }

    if (rating) {
      const ratingNum = parseInt(rating, 10) as CSATRating
      if (ratingNum >= 1 && ratingNum <= 5) {
        filters.rating = ratingNum
      }
    }

    if (startDate) {
      filters.dateFrom = new Date(startDate)
    }

    if (endDate) {
      filters.dateTo = new Date(endDate)
    }

    const { surveys, total } = await getSurveys(tenantId, filters)

    return NextResponse.json({
      surveys,
      pagination: {
        total,
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        totalPages: Math.ceil(total / (filters.limit ?? 50)),
      },
    })
  } catch (error) {
    console.error('[csat/surveys] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch surveys' },
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

    const body = await req.json() as CreateSurveyInput

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

    if (body.channel && !VALID_CHANNELS.includes(body.channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Use email, sms, or in_app' },
        { status: 400 }
      )
    }

    const survey = await createSurvey(tenantId, body)

    return NextResponse.json({ survey }, { status: 201 })
  } catch (error) {
    console.error('[csat/surveys] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create survey' },
      { status: 500 }
    )
  }
}
