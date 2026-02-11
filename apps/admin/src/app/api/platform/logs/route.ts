/**
 * Platform logs query API
 *
 * GET /api/platform/logs - Query logs with filters
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAuth, type AuthContext } from '@cgk/auth'
import { queryLogs, type LogQueryFilters, type ServiceName } from '@cgk/logging'
import type { LogLevelName } from '@cgk/logging'
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
  if (url.searchParams.get('userId')) {
    filters.userId = url.searchParams.get('userId')!
  }
  if (url.searchParams.get('requestId')) {
    filters.requestId = url.searchParams.get('requestId')!
  }
  if (url.searchParams.get('traceId')) {
    filters.traceId = url.searchParams.get('traceId')!
  }
  if (url.searchParams.get('action')) {
    filters.action = url.searchParams.get('action')!
  }
  if (url.searchParams.get('search')) {
    filters.search = url.searchParams.get('search')!
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
