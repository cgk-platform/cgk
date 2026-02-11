/**
 * Error aggregates API
 *
 * GET /api/platform/logs/aggregates - Get grouped error statistics
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk/auth'
import {
  getErrorAggregates,
  getErrorsBySignature,
  type ErrorAggregateFilters,
  type ServiceName,
} from '@cgk/logging'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can view error aggregates
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)

  // Check if requesting details for a specific signature
  const signature = url.searchParams.get('signature')
  if (signature) {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '10', 10)
      const details = await getErrorsBySignature(signature, limit)

      return NextResponse.json({
        signature,
        ...details,
      })
    } catch (error) {
      console.error('Error fetching error details:', error)
      return NextResponse.json({ error: 'Failed to fetch error details' }, { status: 500 })
    }
  }

  // Build filters
  const filters: ErrorAggregateFilters = {
    tenantId,
  }

  // Service filter
  const serviceParam = url.searchParams.get('service')
  if (serviceParam) {
    if (serviceParam.includes(',')) {
      filters.service = serviceParam.split(',') as ServiceName[]
    } else {
      filters.service = serviceParam as ServiceName
    }
  }

  // Time range
  const startTime = url.searchParams.get('startTime')
  const endTime = url.searchParams.get('endTime')
  if (startTime) {
    filters.startTime = new Date(startTime)
  }
  if (endTime) {
    filters.endTime = new Date(endTime)
  }

  // Minimum count filter
  const minCount = url.searchParams.get('minCount')
  if (minCount) {
    filters.minCount = parseInt(minCount, 10)
  }

  try {
    const aggregates = await getErrorAggregates(filters)

    // Calculate summary stats
    const totalErrors = aggregates.reduce(
      (sum: number, agg: { count: number }) => sum + agg.count,
      0
    )
    const uniqueErrors = aggregates.length
    const affectedTenants = new Set(
      aggregates.flatMap((a: { tenantIds: string[] }) => a.tenantIds)
    ).size
    const affectedUsers = aggregates.reduce(
      (sum: number, agg: { affectedUsers: number }) => sum + agg.affectedUsers,
      0
    )

    return NextResponse.json({
      aggregates,
      summary: {
        totalErrors,
        uniqueErrors,
        affectedTenants,
        affectedUsers,
      },
      filters: {
        ...filters,
        startTime: filters.startTime?.toISOString(),
        endTime: filters.endTime?.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching error aggregates:', error)
    return NextResponse.json({ error: 'Failed to fetch error aggregates' }, { status: 500 })
  }
}
