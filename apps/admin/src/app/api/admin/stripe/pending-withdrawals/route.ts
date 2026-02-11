/**
 * Pending Withdrawals API Routes
 * GET: Fetch pending creator/vendor withdrawals awaiting funds
 */

import { getTenantContext } from '@cgk/auth'
import { withTenant, sql } from '@cgk/db'
import { NextResponse } from 'next/server'

import type { PendingWithdrawal } from '@/lib/admin-utilities/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    // Fetch pending withdrawals from payouts table
    const withdrawals = await withTenant(tenantId, async () => {
      const result = await sql`
        SELECT
          p.id,
          c.name as "creatorName",
          p.amount as "amountCents",
          p.status,
          p.created_at as "requestedAt"
        FROM payouts p
        LEFT JOIN creators c ON c.id = p.creator_id
        WHERE p.status IN ('pending', 'processing')
        ORDER BY p.created_at ASC
        LIMIT 50
      `

      return result.rows.map((row) => ({
        id: row.id as string,
        creatorName: (row.creatorName as string) || 'Unknown Creator',
        amountCents: Number(row.amountCents || 0),
        status: row.status as string,
        requestedAt: row.requestedAt as string,
        linkedTopupId: null, // Would be populated from stripe_topups join
      })) as PendingWithdrawal[]
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error('Failed to fetch pending withdrawals:', error)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}
