/**
 * E-Signature Pending Documents API
 *
 * GET /api/admin/esign/pending - Get pending documents by category
 */

import { requireAuth } from '@cgk/auth'
import { NextResponse } from 'next/server'
import { getPendingDocuments } from '@/lib/esign'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
    }

    const pending = await getPendingDocuments(auth.tenantId, auth.email)

    return NextResponse.json(pending)
  } catch (error) {
    console.error('Error fetching pending documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending documents' },
      { status: 500 }
    )
  }
}
