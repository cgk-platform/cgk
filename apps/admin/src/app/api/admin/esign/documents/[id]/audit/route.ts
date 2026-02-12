/**
 * E-Signature Document Audit API
 *
 * GET /api/admin/esign/documents/[id]/audit - Get document audit trail
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import { getDocumentAuditLog, getDocumentWithSigners } from '@/lib/esign'
import type { EsignAuditAction } from '@/lib/esign/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

const ACTION_LABELS: Record<EsignAuditAction, string> = {
  created: 'Document created',
  sent: 'Document sent',
  viewed: 'Document viewed',
  field_filled: 'Field filled',
  signed: 'Document signed',
  declined: 'Document declined',
  voided: 'Document voided',
  reminder_sent: 'Reminder sent',
  resent: 'Document resent',
  counter_signed: 'Counter-signed',
  in_person_started: 'In-person signing started',
  in_person_completed: 'In-person signing completed',
  expired: 'Document expired',
  downloaded: 'Document downloaded',
  forwarded: 'Document forwarded',
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params

    // Get document to verify it exists
    const document = await getDocumentWithSigners(auth.tenantId, id)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get audit log
    const auditLog = await getDocumentAuditLog(auth.tenantId, id)

    // Enrich audit entries with labels and signer info
    const enrichedAudit = auditLog.map((entry) => {
      const signer = entry.signerId
        ? document.signers.find((s) => s.id === entry.signerId)
        : null

      return {
        ...entry,
        actionLabel: ACTION_LABELS[entry.action] || entry.action,
        signerName: signer?.name || null,
        signerEmail: signer?.email || null,
      }
    })

    // Generate audit summary
    const summary = {
      documentId: document.id,
      documentName: document.name,
      createdAt: document.createdAt,
      completedAt: document.completedAt,
      status: document.status,
      totalEvents: auditLog.length,
      firstViewed: auditLog.find((l) => l.action === 'viewed')?.createdAt || null,
      firstSigned: auditLog.find((l) => l.action === 'signed')?.createdAt || null,
      remindersSent: auditLog.filter((l) => l.action === 'reminder_sent').length,
      signers: document.signers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        signedAt: s.signedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      })),
    }

    return NextResponse.json({
      document: {
        id: document.id,
        name: document.name,
        status: document.status,
        createdAt: document.createdAt,
        completedAt: document.completedAt,
      },
      audit: enrichedAudit,
      summary,
    })
  } catch (error) {
    console.error('Error fetching document audit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    )
  }
}
