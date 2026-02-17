export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { StoreCreditAccount, StoreCreditTransaction, StoreCreditTransactionType } from '@/lib/account/types'

/**
 * GET /api/account/store-credit
 * Returns the customer's store credit balance and transaction history
 */
export async function GET() {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get gift card transactions for the customer (this serves as store credit)
  const result = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      amount_cents: number
      status: string
      source: string
      created_at: string
      shopify_order_name: string | null
    }>`
      SELECT
        id,
        amount_cents,
        status,
        source,
        created_at,
        shopify_order_name
      FROM gift_card_transactions
      WHERE shopify_customer_id = ${session.customerId}
        AND status = 'credited'
      ORDER BY created_at DESC
      LIMIT 50
    `
  })

  // Calculate total balance
  let balanceCents = 0
  const transactions: StoreCreditTransaction[] = []

  for (const row of result.rows) {
    balanceCents += row.amount_cents

    // Map source to transaction type
    let type: StoreCreditTransactionType = 'credit_added'
    if (row.source === 'bundle_builder') {
      type = 'gift_card_redemption'
    } else if (row.source === 'refund') {
      type = 'refund'
    } else if (row.source === 'promotion') {
      type = 'credit_added'
    }

    transactions.push({
      id: row.id,
      type,
      amountCents: row.amount_cents,
      balanceAfterCents: balanceCents,
      description: row.shopify_order_name
        ? `Order ${row.shopify_order_name}`
        : 'Store credit added',
      orderId: null,
      createdAt: row.created_at,
      expiresAt: null,
    })
  }

  const account: StoreCreditAccount = {
    id: session.customerId,
    balanceCents,
    currencyCode: 'USD',
    transactions,
    lastUpdated: transactions[0]?.createdAt ?? new Date().toISOString(),
  }

  return NextResponse.json(account)
}
