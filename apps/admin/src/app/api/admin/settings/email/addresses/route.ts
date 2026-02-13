export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createSenderAddress,
  getDomainById,
  listSenderAddresses,
  type CreateSenderAddressInput,
  type SenderPurpose,
} from '@cgk-platform/communications'

const VALID_PURPOSES: SenderPurpose[] = ['transactional', 'creator', 'support', 'treasury', 'system']

/**
 * GET /api/admin/settings/email/addresses
 * List all sender addresses for the tenant
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const addresses = await withTenant(tenantSlug, () => listSenderAddresses())

  return NextResponse.json({ addresses })
}

/**
 * POST /api/admin/settings/email/addresses
 * Create a new sender address
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    domainId: string
    localPart: string
    displayName: string
    purpose: SenderPurpose
    isDefault?: boolean
    isInboundEnabled?: boolean
    replyToAddress?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.domainId || !body.localPart || !body.displayName || !body.purpose) {
    return NextResponse.json(
      { error: 'Missing required fields: domainId, localPart, displayName, purpose' },
      { status: 400 }
    )
  }

  // Validate purpose
  if (!VALID_PURPOSES.includes(body.purpose)) {
    return NextResponse.json(
      { error: `Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate local part (the part before @)
  const localPartRegex = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i
  if (!localPartRegex.test(body.localPart)) {
    return NextResponse.json(
      { error: 'Invalid local part. Use only letters, numbers, dots, hyphens, and underscores.' },
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
    // Verify domain exists and belongs to tenant
    const domain = await withTenant(tenantSlug, () => getDomainById(body.domainId))

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Create sender address
    const input: CreateSenderAddressInput = {
      domainId: body.domainId,
      localPart: body.localPart.toLowerCase(),
      displayName: body.displayName,
      purpose: body.purpose,
      isDefault: body.isDefault,
      isInboundEnabled: body.isInboundEnabled,
      replyToAddress: body.replyToAddress,
    }

    const address = await withTenant(tenantSlug, () => createSenderAddress(input))

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create sender address'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
