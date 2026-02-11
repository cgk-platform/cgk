export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getSmsQueueStats,
  listSmsQueueEntries,
  maskPhoneNumber,
  type SmsQueueFilters,
  type SmsQueueStatus,
} from '@cgk/communications'

/**
 * GET /api/admin/sms/queue
 * List SMS queue entries with optional filters
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Parse filters from query params
  const filters: SmsQueueFilters = {}

  const status = url.searchParams.get('status')
  if (status) {
    filters.status = status.split(',') as SmsQueueStatus[]
  }

  const recipientType = url.searchParams.get('recipientType')
  if (recipientType) {
    filters.recipientType = recipientType as 'customer' | 'creator' | 'contractor' | 'vendor'
  }

  const notificationType = url.searchParams.get('notificationType')
  if (notificationType) {
    filters.notificationType = notificationType
  }

  const limit = url.searchParams.get('limit')
  if (limit) {
    filters.limit = parseInt(limit, 10)
  }

  const offset = url.searchParams.get('offset')
  if (offset) {
    filters.offset = parseInt(offset, 10)
  }

  // Check if stats only
  const statsOnly = url.searchParams.get('statsOnly') === 'true'

  if (statsOnly) {
    const stats = await getSmsQueueStats(tenantSlug)
    return NextResponse.json({ stats })
  }

  const { entries, total } = await listSmsQueueEntries(tenantSlug, filters)

  // Mask phone numbers for privacy
  const maskedEntries = entries.map((entry) => ({
    ...entry,
    phoneNumber: maskPhoneNumber(entry.phoneNumber),
  }))

  // Get stats as well
  const stats = await getSmsQueueStats(tenantSlug)

  return NextResponse.json({
    entries: maskedEntries,
    total,
    stats,
    pagination: {
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      total,
      hasMore: (filters.offset || 0) + (filters.limit || 50) < total,
    },
  })
}
