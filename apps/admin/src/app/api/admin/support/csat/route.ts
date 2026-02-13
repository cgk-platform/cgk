/**
 * CSAT Metrics API
 *
 * GET /api/admin/support/csat - Get CSAT metrics and dashboard data
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  getCSATConfig,
  getCSATMetrics,
  type CSATMetricsOptions,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const includeConfig = searchParams.get('includeConfig') === 'true'

    const options: CSATMetricsOptions = {
      days: Math.min(days, 365), // Cap at 1 year
    }

    if (startDateParam) {
      options.startDate = new Date(startDateParam)
    }

    if (endDateParam) {
      options.endDate = new Date(endDateParam)
    }

    const metrics = await getCSATMetrics(tenantId, options)

    let config = null
    if (includeConfig) {
      config = await getCSATConfig(tenantId)
    }

    return NextResponse.json({
      metrics,
      config,
    })
  } catch (error) {
    console.error('[csat] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch CSAT metrics' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = await req.json() as {
      enabled?: boolean
      autoSendOnResolution?: boolean
      delayHours?: number
      expiryDays?: number
      defaultChannel?: 'email' | 'sms' | 'in_app'
      ratingQuestion?: string
      feedbackPrompt?: string
      lowRatingThreshold?: number
      alertOnLowRating?: boolean
    }

    // Validate delay hours
    if (body.delayHours !== undefined && (body.delayHours < 0 || body.delayHours > 168)) {
      return NextResponse.json(
        { error: 'Delay hours must be between 0 and 168' },
        { status: 400 }
      )
    }

    // Validate expiry days
    if (body.expiryDays !== undefined && (body.expiryDays < 1 || body.expiryDays > 30)) {
      return NextResponse.json(
        { error: 'Expiry days must be between 1 and 30' },
        { status: 400 }
      )
    }

    // Validate low rating threshold
    if (body.lowRatingThreshold !== undefined && (body.lowRatingThreshold < 1 || body.lowRatingThreshold > 5)) {
      return NextResponse.json(
        { error: 'Low rating threshold must be between 1 and 5' },
        { status: 400 }
      )
    }

    const { updateCSATConfig } = await import('@cgk-platform/support')
    const config = await updateCSATConfig(tenantId, body)

    return NextResponse.json({ config })
  } catch (error) {
    console.error('[csat] PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update CSAT config' },
      { status: 500 }
    )
  }
}
