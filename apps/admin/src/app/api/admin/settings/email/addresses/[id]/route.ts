export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteSenderAddress,
  getSenderAddressById,
  updateSenderAddress,
  type SenderPurpose,
  type UpdateSenderAddressInput,
} from '@cgk-platform/communications'

const VALID_PURPOSES: SenderPurpose[] = ['transactional', 'creator', 'support', 'treasury', 'system']

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/settings/email/addresses/[id]
 * Get a specific sender address
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const address = await getSenderAddressById(tenantSlug, id)

  if (!address) {
    return NextResponse.json({ error: 'Sender address not found' }, { status: 404 })
  }

  return NextResponse.json({ address })
}

/**
 * PATCH /api/admin/settings/email/addresses/[id]
 * Update a sender address
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateSenderAddressInput

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate purpose if provided
  if (body.purpose && !VALID_PURPOSES.includes(body.purpose)) {
    return NextResponse.json(
      { error: `Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate reply-to if provided
  if (body.replyToAddress) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.replyToAddress)) {
      return NextResponse.json(
        { error: 'Invalid reply-to email address' },
        { status: 400 }
      )
    }
  }

  try {
    const updated = await updateSenderAddress(tenantSlug, id, body)

    if (!updated) {
      return NextResponse.json({ error: 'Sender address not found' }, { status: 404 })
    }

    // Get full address with domain info
    const address = await getSenderAddressById(tenantSlug, id)

    return NextResponse.json({ address })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update sender address'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE /api/admin/settings/email/addresses/[id]
 * Delete a sender address
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await deleteSenderAddress(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json({ error: 'Sender address not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
