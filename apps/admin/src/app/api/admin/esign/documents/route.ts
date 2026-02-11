/**
 * E-Signature Documents API
 *
 * GET /api/admin/esign/documents - List documents with filters
 * POST /api/admin/esign/documents - Create new document
 */

import { getTenantContext, requireAuth } from '@cgk/auth'
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
    const { templateId, signers } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    if (!signers || signers.length === 0) {
      return NextResponse.json({ error: 'At least one signer required' }, { status: 400 })
    }

    // Note: Document creation would be implemented in the esign core package
    // This is a placeholder for the API structure
    return NextResponse.json(
      { error: 'Document creation not yet implemented - depends on PHASE-4C-ESIGN-CORE' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
