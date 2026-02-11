/**
 * E-Signature Document Detail API
 *
 * GET /api/admin/esign/documents/[id] - Get document with signers and audit log
 */

import { getTenantContext } from '@cgk/auth'
import { NextResponse } from 'next/server'
import { getDocumentWithSigners, getDocumentAuditLog } from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const document = await getDocumentWithSigners(tenantId, id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const auditLog = await getDocumentAuditLog(tenantId, id)

    return NextResponse.json({
      document,
      auditLog,
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}
