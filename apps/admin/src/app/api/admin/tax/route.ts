export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { parseTaxFilters } from '@/lib/search-params'
import { getCreatorTaxInfo, getTaxYearSummary, updateW9Status, generate1099, mark1099Sent } from '@/lib/tax/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const params: Record<string, string | undefined> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const filters = parseTaxFilters(params)
  const [{ rows, totalCount }, summary] = await Promise.all([
    getCreatorTaxInfo(tenantSlug, filters),
    getTaxYearSummary(tenantSlug, filters.tax_year),
  ])

  return NextResponse.json({
    creators: rows,
    totalCount,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(totalCount / filters.limit),
    summary,
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    action?: string
    creatorId?: string
    taxYear?: number
    status?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 })
  }

  if (!body.creatorId) {
    return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 })
  }

  switch (body.action) {
    case 'approve_w9':
    case 'reject_w9': {
      const status = body.action === 'approve_w9' ? 'approved' : 'rejected'
      const success = await updateW9Status(tenantSlug, body.creatorId, status)
      if (!success) {
        return NextResponse.json({ error: 'Failed to update W-9 status' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status })
    }

    case 'generate_1099': {
      const taxYear = body.taxYear || new Date().getFullYear()
      const success = await generate1099(tenantSlug, body.creatorId, taxYear)
      if (!success) {
        return NextResponse.json({ error: 'Failed to generate 1099' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'generated' })
    }

    case 'mark_1099_sent': {
      const taxYear = body.taxYear || new Date().getFullYear()
      const success = await mark1099Sent(tenantSlug, body.creatorId, taxYear)
      if (!success) {
        return NextResponse.json({ error: 'Failed to mark 1099 as sent' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'sent' })
    }

    default:
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve_w9, reject_w9, generate_1099, or mark_1099_sent' },
        { status: 400 },
      )
  }
}
