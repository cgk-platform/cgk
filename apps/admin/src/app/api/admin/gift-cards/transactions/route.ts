export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGiftCardTransactions,
  createManualGiftCardCredit,
  type GiftCardTransactionStatus,
  type GiftCardTransactionSource,
} from '@/lib/gift-card'

/**
 * GET /api/admin/gift-cards/transactions
 * Get gift card transactions with filters
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as GiftCardTransactionStatus | null
  const source = searchParams.get('source') as GiftCardTransactionSource | null
  const search = searchParams.get('search') || undefined
  const dateFrom = searchParams.get('date_from') || undefined
  const dateTo = searchParams.get('date_to') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  const { rows, totalCount } = await withTenant(tenantSlug, async () => {
    return getGiftCardTransactions({
      status: status || undefined,
      source: source || undefined,
      search,
      date_from: dateFrom,
      date_to: dateTo,
      page,
      limit,
      offset,
    })
  })

  return NextResponse.json({
    transactions: rows,
    pagination: {
      page,
      limit,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / limit),
    },
  })
}

/**
 * POST /api/admin/gift-cards/transactions
 * Create a manual gift card credit
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    shopify_customer_id: string
    customer_email: string
    customer_name?: string
    amount_cents: number
    note?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.shopify_customer_id || !body.customer_email || !body.amount_cents) {
    return NextResponse.json(
      { error: 'Missing required fields: shopify_customer_id, customer_email, amount_cents' },
      { status: 400 }
    )
  }

  if (body.amount_cents <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const transaction = await withTenant(tenantSlug, async () => {
    return createManualGiftCardCredit({
      shopify_customer_id: body.shopify_customer_id,
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      amount_cents: body.amount_cents,
      note: body.note,
    })
  })

  return NextResponse.json({ transaction })
}
