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

  // Validate reply-to if provided with RFC-compliant validation
  if (body.replyToAddress) {
    // RFC 5321 limits: local part max 64 chars, domain max 255 chars, total max 254 chars
    const MAX_EMAIL_LENGTH = 254
    const MAX_LOCAL_PART_LENGTH = 64
    const MAX_DOMAIN_LENGTH = 255

    if (body.replyToAddress.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json(
        { error: `Reply-to email address exceeds maximum length of ${MAX_EMAIL_LENGTH} characters` },
        { status: 400 }
      )
    }

    // More comprehensive email regex that validates:
    // - Local part: alphanumeric, dots, hyphens, underscores, plus signs (no consecutive dots, no leading/trailing dots)
    // - Domain: valid hostname format with at least one dot and valid TLD
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(body.replyToAddress)) {
      return NextResponse.json(
        { error: 'Invalid reply-to email address format' },
        { status: 400 }
      )
    }

    // Additional validation: check local part and domain lengths
    const [localPart, domain] = body.replyToAddress.split('@')
    if (localPart && localPart.length > MAX_LOCAL_PART_LENGTH) {
      return NextResponse.json(
        { error: `Email local part exceeds maximum length of ${MAX_LOCAL_PART_LENGTH} characters` },
        { status: 400 }
      )
    }
    if (domain && domain.length > MAX_DOMAIN_LENGTH) {
      return NextResponse.json(
        { error: `Email domain exceeds maximum length of ${MAX_DOMAIN_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Check for consecutive dots in local part
    if (localPart && localPart.includes('..')) {
      return NextResponse.json(
        { error: 'Email local part cannot contain consecutive dots' },
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
