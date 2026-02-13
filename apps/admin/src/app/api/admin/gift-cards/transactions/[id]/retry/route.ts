export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getGiftCardTransactionById,
  resetTransactionToPending,
} from '@/lib/gift-card'

/**
 * POST /api/admin/gift-cards/transactions/[id]/retry
 * Reset a failed transaction to pending for retry
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Check if transaction exists
    const existing = await getGiftCardTransactionById(id)
    if (!existing) {
      return { error: 'Transaction not found', status: 404 }
    }

    // Only allow retry of failed transactions
    if (existing.status !== 'failed') {
      return {
        error: `Cannot retry transaction with status "${existing.status}". Only failed transactions can be retried.`,
        status: 400,
      }
    }

    // Reset to pending
    const transaction = await resetTransactionToPending(id)
    if (!transaction) {
      return { error: 'Failed to reset transaction', status: 500 }
    }

    return { transaction }
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ transaction: result.transaction })
}
