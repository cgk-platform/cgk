export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getOptOut,
  normalizeToE164,
  removeOptOut,
} from '@cgk-platform/communications'

interface RouteParams {
  params: Promise<{ phone: string }>
}

/**
 * DELETE /api/admin/sms/opt-outs/[phone]
 * Remove an opt-out (opt back in)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { phone } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Phone number comes URL encoded
  const decodedPhone = decodeURIComponent(phone)
  const normalized = normalizeToE164(decodedPhone)

  if (!normalized) {
    return NextResponse.json(
      { error: 'Invalid phone number format' },
      { status: 400 }
    )
  }

  // Check if opt-out exists
  const optOut = await getOptOut(tenantSlug, normalized)

  if (!optOut) {
    return NextResponse.json(
      { error: 'Opt-out not found' },
      { status: 404 }
    )
  }

  const removed = await removeOptOut(tenantSlug, normalized)

  if (!removed) {
    return NextResponse.json(
      { error: 'Failed to remove opt-out' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Phone number has been opted back in',
  })
}
