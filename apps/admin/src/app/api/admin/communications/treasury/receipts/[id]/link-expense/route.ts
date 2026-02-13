/**
 * Link Receipt to Expense API
 *
 * POST /api/admin/communications/treasury/receipts/[id]/link-expense
 * Creates an expense from the receipt and links them
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface LinkExpenseInput {
  vendorName: string
  description: string
  amountCents: number
  categoryId: string
  expenseDate: string
  notes?: string
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: LinkExpenseInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.vendorName || !body.description || !body.amountCents || !body.categoryId || !body.expenseDate) {
    return NextResponse.json(
      { error: 'Missing required fields: vendorName, description, amountCents, categoryId, expenseDate' },
      { status: 400 }
    )
  }

  const result = await withTenant(tenantSlug, async () => {
    // Get the receipt
    const receiptResult = await sql`
      SELECT * FROM treasury_receipts WHERE id = ${id}
    `

    if (receiptResult.rows.length === 0) {
      return { error: 'Receipt not found', status: 404 }
    }

    const receipt = receiptResult.rows[0]

    if (!receipt) {
      return { error: 'Receipt not found', status: 404 }
    }

    // Check if already linked
    if (receipt.linked_expense_id) {
      return { error: 'Receipt is already linked to an expense', status: 400 }
    }

    // Get the first attachment URL as receipt_url
    const attachments = (receipt.attachments || []) as Array<{ blobUrl: string }>
    const receiptUrl = attachments[0]?.blobUrl || null

    // Create expense
    const expenseResult = await sql`
      INSERT INTO operating_expenses (
        tenant_id,
        date,
        category_id,
        description,
        amount_cents,
        vendor_name,
        notes,
        receipt_url,
        created_by
      ) VALUES (
        ${tenantSlug},
        ${body.expenseDate},
        ${body.categoryId},
        ${body.description},
        ${body.amountCents},
        ${body.vendorName},
        ${body.notes || null},
        ${receiptUrl},
        ${userId}
      )
      RETURNING id
    `

    const expenseId = expenseResult.rows[0]?.id as string

    // Link expense to receipt
    await sql`
      UPDATE treasury_receipts
      SET
        linked_expense_id = ${expenseId},
        status = 'processed',
        vendor_name = ${body.vendorName},
        description = ${body.description},
        amount_cents = ${body.amountCents},
        expense_category_id = ${body.categoryId},
        receipt_date = ${body.expenseDate},
        notes = ${body.notes || null},
        processed_by = ${userId},
        processed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `

    return {
      success: true,
      receiptId: id,
      expenseId,
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
