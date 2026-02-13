/**
 * E-Signature Document Download API
 *
 * GET /api/admin/esign/documents/[id]/download - Get document download URL
 */

import { requireAuth } from '@cgk-platform/auth'
import { NextResponse } from 'next/server'
import { getDocumentWithSigners, addAuditLogEntry } from '@/lib/esign'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const signed = searchParams.get('signed') === 'true'

    // Get document
    const document = await getDocumentWithSigners(auth.tenantId, id)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Determine which URL to return
    let downloadUrl: string | null = null
    let isSigned = false

    if (signed && document.signedFileUrl) {
      // Request for signed version and it exists
      downloadUrl = document.signedFileUrl
      isSigned = true
    } else if (signed && !document.signedFileUrl) {
      // Request for signed version but it doesn't exist
      return NextResponse.json(
        { error: 'Signed document not available' },
        { status: 400 }
      )
    } else {
      // Request for original document
      downloadUrl = document.fileUrl
      isSigned = false
    }

    // Log download action
    await addAuditLogEntry(auth.tenantId, {
      documentId: id,
      action: 'downloaded',
      details: {
        isSigned,
        downloadedBy: auth.email,
      },
      performedBy: auth.userId,
    })

    return NextResponse.json({
      downloadUrl,
      documentName: document.name,
      isSigned,
      documentStatus: document.status,
    })
  } catch (error) {
    console.error('Error getting download URL:', error)
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    )
  }
}
