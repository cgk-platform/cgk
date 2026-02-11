/**
 * E-Signature Counter-Sign Queue API
 *
 * GET /api/admin/esign/counter-sign - Get counter-sign queue
 * POST /api/admin/esign/counter-sign - Counter-sign a document
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import {
  getCounterSignQueue,
  markSignerSigned,
  addAuditLogEntry,
} from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const documents = await getCounterSignQueue(auth.tenantId, auth.email)

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error fetching counter-sign queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch counter-sign queue' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const body = await request.json()
    const { documentId, signerId } = body

    if (!documentId || !signerId) {
      return NextResponse.json(
        { error: 'Document ID and Signer ID required' },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    const signed = await markSignerSigned(auth.tenantId, signerId, ipAddress, userAgent)

    if (!signed) {
      return NextResponse.json(
        { error: 'Failed to record counter-signature' },
        { status: 500 }
      )
    }

    await addAuditLogEntry(auth.tenantId, {
      documentId,
      signerId,
      action: 'counter_signed',
      ipAddress,
      userAgent,
      performedBy: auth.userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error counter-signing:', error)
    return NextResponse.json(
      { error: 'Failed to counter-sign document' },
      { status: 500 }
    )
  }
}
