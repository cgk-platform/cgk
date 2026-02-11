/**
 * Inbound Email Detail API
 *
 * GET /api/admin/communications/inbound/[id] - Get inbound email details
 *
 * @ai-pattern api-route
 * @ai-note Tenant-isolated via x-tenant-slug header
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { withTenant } from '@cgk/db'
import { getInboundEmailById } from '@cgk/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const email = await withTenant(tenantSlug, async () => {
    return getInboundEmailById(id)
  })

  if (!email) {
    return NextResponse.json({ error: 'Inbound email not found' }, { status: 404 })
  }

  return NextResponse.json({ email })
}
