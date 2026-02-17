/**
 * Creator Tax Document Download Route
 *
 * Handles downloading individual tax documents (1099 forms)
 */

import { NextResponse } from 'next/server'
import { sql, withTenant, getTenantFromRequest } from '@cgk-platform/db'

import { requireCreatorAuth, CreatorAuthError } from '../../../../../../lib/auth'

export const dynamic = 'force-dynamic'

interface TaxForm {
  id: string
  payeeId: string
  payeeType: string
  taxYear: number
  formType: string
  payerTin: string
  payerName: string
  payerAddress: Record<string, unknown>
  recipientTinLastFour: string
  recipientName: string
  recipientAddress: Record<string, unknown>
  totalAmountCents: number
  boxAmounts: Record<string, unknown>
  status: string
  createdAt: string
  approvedAt: string | null
  irsFiledAt: string | null
  irsConfirmationNumber: string | null
  deliveryMethod: string | null
  deliveredAt: string | null
}

/**
 * Map database row to TaxForm
 */
function mapRowToTaxForm(row: Record<string, unknown>): TaxForm {
  return {
    id: row.id as string,
    payeeId: row.payee_id as string,
    payeeType: row.payee_type as string,
    taxYear: parseInt(row.tax_year as string, 10),
    formType: row.form_type as string,
    payerTin: row.payer_tin as string,
    payerName: row.payer_name as string,
    payerAddress: row.payer_address as Record<string, unknown>,
    recipientTinLastFour: row.recipient_tin_last_four as string,
    recipientName: row.recipient_name as string,
    recipientAddress: row.recipient_address as Record<string, unknown>,
    totalAmountCents: parseInt(row.total_amount_cents as string, 10),
    boxAmounts: row.box_amounts as Record<string, unknown>,
    status: row.status as string,
    createdAt: row.created_at as string,
    approvedAt: (row.approved_at as string) || null,
    irsFiledAt: (row.irs_filed_at as string) || null,
    irsConfirmationNumber: (row.irs_confirmation_number as string) || null,
    deliveryMethod: (row.delivery_method as string) || null,
    deliveredAt: (row.delivered_at as string) || null,
  }
}

// GET - Download a specific tax document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get tenant context
  const tenant = await getTenantFromRequest(request)
  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  // Require creator authentication
  let creatorContext
  try {
    creatorContext = await requireCreatorAuth(request)
  } catch (error) {
    if (error instanceof CreatorAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Fetch tax document from database
  const document = await withTenant(tenant.slug, async () => {
    const result = await sql`
      SELECT
        tf.id,
        tf.payee_id,
        tf.payee_type,
        tf.tax_year,
        tf.form_type,
        tf.payer_tin,
        tf.payer_name,
        tf.payer_address,
        tf.recipient_tin_last_four,
        tf.recipient_name,
        tf.recipient_address,
        tf.total_amount_cents,
        tf.box_amounts,
        tf.status,
        tf.created_at,
        tf.approved_at,
        tf.irs_filed_at,
        tf.irs_confirmation_number,
        tf.delivery_method,
        tf.delivered_at
      FROM tax_forms tf
      WHERE tf.id = ${id}
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return mapRowToTaxForm(row as Record<string, unknown>)
  })

  if (!document) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    )
  }

  // Verify the document belongs to this creator
  // The payee_id should match the creator's ID
  if (document.payeeType === 'creator' && document.payeeId !== creatorContext.creatorId) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    )
  }

  // Only return filed or approved documents to creators
  if (!['filed', 'approved', 'delivered'].includes(document.status)) {
    return NextResponse.json(
      { error: 'Document not available for download' },
      { status: 403 }
    )
  }

  // Return document metadata and download URL
  return NextResponse.json({
    document: {
      id: document.id,
      year: document.taxYear,
      formType: document.formType,
      recipientName: document.recipientName,
      recipientTinLastFour: document.recipientTinLastFour,
      totalAmountCents: document.totalAmountCents,
      status: document.status,
      filedAt: document.irsFiledAt,
    },
    downloadUrl: `/api/creator/tax/documents/${id}/pdf`,
  })
}
