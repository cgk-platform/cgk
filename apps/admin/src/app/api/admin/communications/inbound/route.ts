/**
 * Inbound Email List API
 *
 * GET /api/admin/communications/inbound - List inbound emails with filters
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant } from '@cgk-platform/db'
import { listInboundEmails } from '@cgk-platform/communications'
import type { InboundEmailType, InboundProcessingStatus } from '@cgk-platform/communications'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Parse query parameters
  const emailType = url.searchParams.get('type') as InboundEmailType | undefined
  const processingStatus = url.searchParams.get('status') as InboundProcessingStatus | undefined
  const fromAddress = url.searchParams.get('from') || undefined
  const dateFrom = url.searchParams.get('dateFrom') || undefined
  const dateTo = url.searchParams.get('dateTo') || undefined
  const search = url.searchParams.get('search') || undefined
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  const result = await withTenant(tenantSlug, async () => {
    return listInboundEmails({
      emailType: emailType || undefined,
      processingStatus: processingStatus || undefined,
      fromAddress,
      dateFrom,
      dateTo,
      search,
      limit: Math.min(limit, 100),
      offset: (page - 1) * limit,
    })
  })

  return NextResponse.json({
    emails: result.emails,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  })
}
