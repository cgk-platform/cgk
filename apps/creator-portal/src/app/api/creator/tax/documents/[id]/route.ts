/**
 * Creator Tax Document Download Route
 *
 * Handles downloading individual tax documents (1099 forms)
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Download a specific tax document
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Would get creator from session and verify ownership
  // const creatorId = 'creator_123' // TODO: Get from session

  // Would fetch document using @cgk-platform/tax
  // const document = await getTaxFormById(tenantSlug, id)
  // if (!document || document.payeeId !== creatorId) {
  //   return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  // }

  // Mock document data
  const document = {
    id,
    year: 2024,
    formType: '1099-NEC',
    recipientName: 'John Creator',
    recipientTinLastFour: '1234',
    totalAmountCents: 125000,
    status: 'filed',
    filedAt: '2025-01-28',
  }

  // For now, return document metadata
  // In production, would generate/return PDF
  return NextResponse.json({
    document,
    downloadUrl: `/api/creator/tax/documents/${id}/pdf`,
  })
}
