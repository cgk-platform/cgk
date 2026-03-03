/**
 * E-Signature Document Resend API
 *
 * POST /api/admin/esign/documents/[id]/resend - Resend to pending signers
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { resendDocument, addAuditLogEntry } from '@/lib/esign'
import { logger } from '@cgk-platform/logging'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json().catch(() => {
      // Empty body is valid - signerId is optional for resend
      return {}
    })
    const { signerId } = body

    const result = await resendDocument(auth.tenantId, id, signerId)

    if (result.success) {
      await addAuditLogEntry(auth.tenantId, {
        documentId: id,
        signerId,
        action: 'resent',
        details: { sentTo: result.sentTo },
        performedBy: auth.userId,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error resending document:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to resend document' },
      { status: 500 }
    )
  }
}
