/**
 * Treasury Receipt Detail API
 *
 * GET /api/admin/communications/treasury/receipts/[id] - Get receipt details
 * PATCH /api/admin/communications/treasury/receipts/[id] - Update receipt
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk/db'
import type { TreasuryReceipt, ReceiptStatus } from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const receipt = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_receipts WHERE id = ${id}
    `
    return result.rows[0]
      ? mapRowToReceipt(result.rows[0] as Record<string, unknown>)
      : null
  })

  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  return NextResponse.json({ receipt })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  let body: {
    status?: ReceiptStatus
    vendorName?: string
    description?: string
    amountCents?: number
    currency?: string
    expenseCategoryId?: string
    receiptDate?: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, async () => {
    // Check if receipt exists
    const existing = await sql`
      SELECT id FROM treasury_receipts WHERE id = ${id}
    `

    if (existing.rows.length === 0) {
      return { error: 'Receipt not found', status: 404 }
    }

    // Update receipt
    const updateResult = await sql`
      UPDATE treasury_receipts
      SET
        status = COALESCE(${body.status ?? null}, status),
        vendor_name = COALESCE(${body.vendorName ?? null}, vendor_name),
        description = COALESCE(${body.description ?? null}, description),
        amount_cents = COALESCE(${body.amountCents ?? null}, amount_cents),
        currency = COALESCE(${body.currency ?? null}, currency),
        expense_category_id = COALESCE(${body.expenseCategoryId ?? null}, expense_category_id),
        receipt_date = COALESCE(${body.receiptDate ?? null}, receipt_date),
        notes = COALESCE(${body.notes ?? null}, notes),
        processed_by = ${userId ?? null},
        processed_at = CASE WHEN ${body.status === 'processed'} THEN NOW() ELSE processed_at END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return {
      receipt: mapRowToReceipt(updateResult.rows[0] as Record<string, unknown>),
    }
  })

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    )
  }

  return NextResponse.json(result)
}
