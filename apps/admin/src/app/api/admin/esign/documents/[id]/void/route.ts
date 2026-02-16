/**
 * E-Signature Document Void API
 *
 * POST /api/admin/esign/documents/[id]/void - Void a document
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { voidDocument } from '@/lib/esign'

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
      // Empty body is valid - reason is optional for void
      return {}
    })
    const { reason } = body

    const success = await voidDocument(auth.tenantId, id, reason, auth.userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Document cannot be voided (may already be completed or voided)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error voiding document:', error)
    return NextResponse.json(
      { error: 'Failed to void document' },
      { status: 500 }
    )
  }
}
