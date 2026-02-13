/**
 * E-Signature In-Person Signing API
 *
 * POST /api/admin/esign/documents/[id]/in-person - Start in-person signing session
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import {
  createInPersonSession,
  getActiveInPersonSession,
  addAuditLogEntry,
} from '@/lib/esign'

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

    const { id: documentId } = await params
    const body = await request.json()
    const { signerId, pin, deviceInfo } = body

    if (!signerId) {
      return NextResponse.json({ error: 'Signer ID required' }, { status: 400 })
    }

    // Check for existing active session
    const existingSession = await getActiveInPersonSession(auth.tenantId, documentId)
    if (existingSession) {
      return NextResponse.json(
        { error: 'An in-person signing session is already active for this document' },
        { status: 409 }
      )
    }

    const session = await createInPersonSession(auth.tenantId, {
      documentId,
      signerId,
      startedBy: auth.userId,
      pin,
      deviceInfo,
    })

    await addAuditLogEntry(auth.tenantId, {
      documentId,
      signerId,
      action: 'in_person_started',
      details: { sessionId: session.id },
      performedBy: auth.userId,
    })

    return NextResponse.json({
      success: true,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    })
  } catch (error) {
    console.error('Error starting in-person session:', error)
    return NextResponse.json(
      { error: 'Failed to start in-person signing session' },
      { status: 500 }
    )
  }
}
