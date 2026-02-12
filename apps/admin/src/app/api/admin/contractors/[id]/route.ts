import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import {
  deleteContractor,
  getContractorWithPayee,
  updateContractor,
} from '@/lib/contractors/db'
import type { UpdateContractorRequest } from '@/lib/contractors/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/contractors/[id]
 * Get contractor details with payee info
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const contractor = await getContractorWithPayee(tenantSlug, id)

  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  return NextResponse.json(contractor)
}

/**
 * PATCH /api/admin/contractors/[id]
 * Update contractor profile
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateContractorRequest

  const contractor = await updateContractor(tenantSlug, id, body)

  if (!contractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  return NextResponse.json(contractor)
}

/**
 * DELETE /api/admin/contractors/[id]
 * Soft delete contractor (sets status to inactive)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const deleted = await deleteContractor(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
