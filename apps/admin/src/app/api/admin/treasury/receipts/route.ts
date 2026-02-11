export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getReceipts,
  createReceipt,
  getReceiptSummary,
} from '@/lib/treasury/db/receipts'
import type { CreateReceiptInput, ReceiptStatus } from '@/lib/treasury/types'

/**
 * GET /api/admin/treasury/receipts
 * List receipts with optional filters
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status') as ReceiptStatus | null
  const vendor = url.searchParams.get('vendor')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const includeSummary = url.searchParams.get('summary') === 'true'

  const offset = (page - 1) * limit

  const { receipts, totalCount } = await getReceipts(tenantSlug, {
    status: status || undefined,
    vendor: vendor || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit,
    offset,
  })

  const response: {
    receipts: typeof receipts
    totalCount: number
    page: number
    limit: number
    totalPages: number
    summary?: Awaited<ReturnType<typeof getReceiptSummary>>
  } = {
    receipts,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  }

  if (includeSummary) {
    response.summary = await getReceiptSummary(tenantSlug)
  }

  return NextResponse.json(response)
}

/**
 * POST /api/admin/treasury/receipts
 * Create a new receipt
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: CreateReceiptInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.file_url) {
    return NextResponse.json({ error: 'File URL is required' }, { status: 400 })
  }

  if (!body.file_name) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 })
  }

  // Validate amount if provided
  if (body.amount_cents !== undefined && body.amount_cents < 0) {
    return NextResponse.json(
      { error: 'Amount must be non-negative' },
      { status: 400 }
    )
  }

  // Validate date if provided
  if (body.receipt_date) {
    const date = new Date(body.receipt_date)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid receipt date' },
        { status: 400 }
      )
    }
  }

  try {
    const receipt = await createReceipt(tenantSlug, body, userId)
    return NextResponse.json({ receipt }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
