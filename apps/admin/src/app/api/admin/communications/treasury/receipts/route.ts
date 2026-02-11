/**
 * Treasury Receipts API
 *
 * GET /api/admin/communications/treasury/receipts - List treasury receipts
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk/db'
import type { TreasuryReceipt, ReceiptStatus } from '@cgk/communications'

/**
 * Map database row to TreasuryReceipt
 */
function mapRowToReceipt(row: Record<string, unknown>): TreasuryReceipt {
  return {
    id: row.id as string,
    inboundEmailId: row.inbound_email_id as string | null,
    fromAddress: row.from_address as string,
    subject: row.subject as string | null,
    body: row.body as string | null,
    attachments: (row.attachments || []) as TreasuryReceipt['attachments'],
    status: row.status as ReceiptStatus,
    linkedExpenseId: row.linked_expense_id as string | null,
    vendorName: row.vendor_name as string | null,
    description: row.description as string | null,
    amountCents: row.amount_cents as number | null,
    currency: (row.currency as string) || 'USD',
    expenseCategoryId: row.expense_category_id as string | null,
    receiptDate: row.receipt_date as string | null,
    notes: row.notes as string | null,
    processedBy: row.processed_by as string | null,
    processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  // Parse query parameters
  const status = url.searchParams.get('status') as ReceiptStatus | undefined
  // Note: fromAddress, dateFrom, dateTo, search are reserved for future advanced filtering
  void url.searchParams.get('from')
  void url.searchParams.get('dateFrom')
  void url.searchParams.get('dateTo')
  void url.searchParams.get('search')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
  const offset = (page - 1) * limit

  const result = await withTenant(tenantSlug, async () => {
    // Build query - using simple approach without complex WHERE building
    let receiptsResult
    let countResult

    if (status) {
      [receiptsResult, countResult] = await Promise.all([
        sql`
          SELECT * FROM treasury_receipts
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM treasury_receipts
          WHERE status = ${status}
        `,
      ])
    } else {
      [receiptsResult, countResult] = await Promise.all([
        sql`
          SELECT * FROM treasury_receipts
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM treasury_receipts
        `,
      ])
    }

    return {
      receipts: receiptsResult.rows.map((row) =>
        mapRowToReceipt(row as Record<string, unknown>)
      ),
      total: parseInt(countResult.rows[0]?.total as string, 10) || 0,
    }
  })

  return NextResponse.json({
    receipts: result.receipts,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  })
}
