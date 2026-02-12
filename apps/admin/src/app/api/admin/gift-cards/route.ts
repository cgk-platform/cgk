export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getTransactionStats,
  countActiveProducts,
  countPendingEmails,
  type GiftCardStats,
} from '@/lib/gift-card'

/**
 * GET /api/admin/gift-cards
 * Get gift card dashboard statistics
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const stats = await withTenant(tenantSlug, async () => {
    const [transactionStats, activeProductsCount, pendingEmailsCount] = await Promise.all([
      getTransactionStats(),
      countActiveProducts(),
      countPendingEmails(),
    ])

    const result: GiftCardStats = {
      ...transactionStats,
      active_products_count: activeProductsCount,
      pending_emails_count: pendingEmailsCount,
    }

    return result
  })

  return NextResponse.json({ stats })
}
