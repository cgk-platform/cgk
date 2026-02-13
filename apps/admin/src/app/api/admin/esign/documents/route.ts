/**
 * E-Signature Documents API
 *
 * GET /api/admin/esign/documents - List documents with filters
 * POST /api/admin/esign/documents - Create and send new document
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import { prepareAndSendDocument } from '@cgk-platform/esign'
import { NextResponse } from 'next/server'
import { getDocuments } from '@/lib/esign'
import type { EsignDocumentFilters } from '@/lib/esign/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantContext(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    const filters: EsignDocumentFilters = {}

    const status = searchParams.get('status')
    if (status) {
      filters.status = status as EsignDocumentFilters['status']
    }

    const templateId = searchParams.get('templateId')
    if (templateId) {
      filters.templateId = templateId
    }

    const creatorId = searchParams.get('creatorId')
    if (creatorId) {
      filters.creatorId = creatorId
    }

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom)
    }

    const dateTo = searchParams.get('dateTo')
    if (dateTo) {
      filters.dateTo = new Date(dateTo)
    }

    const expiresWithinDays = searchParams.get('expiresWithinDays')
    if (expiresWithinDays) {
      filters.expiresWithinDays = parseInt(expiresWithinDays, 10)
    }

    const search = searchParams.get('search')
    if (search) {
      filters.search = search
    }

    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const { documents, total } = await getDocuments(tenantId, filters, page, limit)

    return NextResponse.json({
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
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
    const {
      templateId,
      documentName,
      signers,
      message,
      expiresInDays,
      reminderEnabled,
      reminderDays,
      creatorId,
    } = body

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json({ error: 'At least one signer is required' }, { status: 400 })
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.name || typeof signer.name !== 'string') {
        return NextResponse.json({ error: 'All signers must have a name' }, { status: 400 })
      }
      if (!signer.email || typeof signer.email !== 'string' || !signer.email.includes('@')) {
        return NextResponse.json({ error: 'All signers must have a valid email' }, { status: 400 })
      }
    }

    const result = await prepareAndSendDocument(auth.tenantId, {
      template_id: templateId,
      name: documentName,
      signers: signers.map((s: { name: string; email: string; role?: string; signingOrder?: number; isInternal?: boolean }) => ({
        name: s.name,
        email: s.email,
        role: s.role as 'signer' | 'cc' | 'viewer' | 'approver' | undefined,
        signing_order: s.signingOrder,
        is_internal: s.isInternal,
      })),
      message,
      expires_in_days: expiresInDays,
      reminder_enabled: reminderEnabled,
      reminder_days: reminderDays,
      creator_id: creatorId,
      created_by: auth.userId || auth.email || 'unknown',
    })

    return NextResponse.json({
      document: result.document,
      signers: result.signers,
      signersToNotify: result.signers_to_notify.map((s: { email: string }) => s.email),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    const message = error instanceof Error ? error.message : 'Failed to create document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
