export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createInboundTestInstructions,
  getSenderAddressById,
} from '@cgk/communications'

/**
 * POST /api/admin/onboarding/email/inbound/test
 * Get instructions for testing inbound email
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { senderAddressId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.senderAddressId) {
    return NextResponse.json(
      { error: 'Missing required field: senderAddressId' },
      { status: 400 }
    )
  }

  // Get the sender address
  const senderAddress = await withTenant(tenantSlug, () =>
    getSenderAddressById(body.senderAddressId)
  )

  if (!senderAddress) {
    return NextResponse.json(
      { error: 'Sender address not found' },
      { status: 404 }
    )
  }

  if (!senderAddress.isInboundEnabled) {
    return NextResponse.json(
      { error: 'Inbound email is not enabled for this address' },
      { status: 400 }
    )
  }

  const instructions = await createInboundTestInstructions(
    senderAddress.emailAddress,
    tenantSlug
  )

  return NextResponse.json(instructions)
}
