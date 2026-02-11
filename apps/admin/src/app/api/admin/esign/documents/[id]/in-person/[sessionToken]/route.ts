/**
 * E-Signature In-Person Session API
 *
 * GET /api/admin/esign/documents/[id]/in-person/[sessionToken] - Get session details
 * POST /api/admin/esign/documents/[id]/in-person/[sessionToken] - Complete signing
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import {
  getInPersonSessionByToken,
  completeInPersonSession,
  getDocumentWithSigners,
  markSignerSigned,
  addAuditLogEntry,
} from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionToken: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id: documentId, sessionToken } = await params

    const session = await getInPersonSessionByToken(tenantId, sessionToken)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.documentId !== documentId) {
      return NextResponse.json({ error: 'Session does not match document' }, { status: 400 })
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: `Session is ${session.status}` },
        { status: 400 }
      )
    }

    if (new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 400 })
    }

    const document = await getDocumentWithSigners(tenantId, documentId)
    const signer = document?.signers.find((s) => s.id === session.signerId)

    if (!document || !signer) {
      return NextResponse.json({ error: 'Document or signer not found' }, { status: 404 })
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        expiresAt: session.expiresAt,
        hasPin: !!session.pinHash,
      },
      document: {
        id: document.id,
        name: document.name,
        fileUrl: document.fileUrl,
      },
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
      },
    })
  } catch (error) {
    console.error('Error fetching in-person session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionToken: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id: documentId, sessionToken } = await params
    // Body may contain fields and signatureData for future use
    await request.json()

    const session = await getInPersonSessionByToken(auth.tenantId, sessionToken)
    if (!session || session.documentId !== documentId || session.status !== 'active') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 })
    }

    // Get IP and user agent from request
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Mark signer as signed
    const signed = await markSignerSigned(auth.tenantId, session.signerId, ipAddress, userAgent)
    if (!signed) {
      return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 })
    }

    // Complete the session
    await completeInPersonSession(auth.tenantId, session.id)

    await addAuditLogEntry(auth.tenantId, {
      documentId,
      signerId: session.signerId,
      action: 'in_person_completed',
      details: { sessionId: session.id },
      ipAddress,
      userAgent,
      performedBy: auth.userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing in-person signing:', error)
    return NextResponse.json(
      { error: 'Failed to complete signing' },
      { status: 500 }
    )
  }
}
