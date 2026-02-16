/**
 * Platform logs query API
 *
 * GET /api/platform/logs - Query logs with filters
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk-platform/auth'
import { queryLogs, type LogQueryFilters, type ServiceName } from '@cgk-platform/logging'
import type { LogLevelName } from '@cgk-platform/logging'
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

  // Only admins can view logs
  if (!['owner', 'admin', 'super_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)

  // Parse query parameters
  const filters: LogQueryFilters = {
    tenantId,
    tenantSlug: url.searchParams.get('tenantSlug') ?? undefined,
  }

  // Level filter
  const levelParam = url.searchParams.get('level')
  if (levelParam) {
    if (levelParam.includes(',')) {
      filters.level = levelParam.split(',') as LogLevelName[]
    } else {
      filters.level = levelParam as LogLevelName
    }
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

  // Other filters
  const userIdParam = url.searchParams.get('userId')
  if (userIdParam) {
    filters.userId = userIdParam
  }
  const requestIdParam = url.searchParams.get('requestId')
  if (requestIdParam) {
    filters.requestId = requestIdParam
  }
  const traceIdParam = url.searchParams.get('traceId')
  if (traceIdParam) {
    filters.traceId = traceIdParam
  }
  const actionParam = url.searchParams.get('action')
  if (actionParam) {
    filters.action = actionParam
  }
  const searchParam = url.searchParams.get('search')
  if (searchParam) {
    filters.search = searchParam
  }

  // Time range with validation
  const startTime = url.searchParams.get('startTime')
  const endTime = url.searchParams.get('endTime')
  if (startTime) {
    const parsedStartTime = new Date(startTime)
    if (isNaN(parsedStartTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startTime format. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z)' },
        { status: 400 }
      )
    }
    filters.startTime = parsedStartTime
  }
  if (endTime) {
    const parsedEndTime = new Date(endTime)
    if (isNaN(parsedEndTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endTime format. Use ISO 8601 format (e.g., 2024-01-15T23:59:59Z)' },
        { status: 400 }
      )
    }
    filters.endTime = parsedEndTime
  }

  // Validate time range logic
  if (filters.startTime && filters.endTime && filters.startTime > filters.endTime) {
    return NextResponse.json(
      { error: 'startTime must be before endTime' },
      { status: 400 }
    )
  }

  // Error filter
  const hasError = url.searchParams.get('hasError')
  if (hasError === 'true') {
    filters.hasError = true
  } else if (hasError === 'false') {
    filters.hasError = false
  }

  // Pagination
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  try {
    const result = await queryLogs(filters, { limit, offset })

    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      hasMore: result.hasMore,
      cursor: result.cursor,
      filters: {
        ...filters,
        startTime: filters.startTime?.toISOString(),
        endTime: filters.endTime?.toISOString(),
      },
      pagination: { limit, offset },
    })
  } catch (error) {
    console.error('Error querying logs:', error)
    return NextResponse.json({ error: 'Failed to query logs' }, { status: 500 })
  }
}
