export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createDomain,
  getResendConfig,
  listDomains,
  registerDomainWithResend,
  type CreateDomainInput,
} from '@cgk-platform/communications'

/**
 * GET /api/admin/settings/email/domains
 * List all email domains for the tenant
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const domains = await listDomains(tenantSlug)

  return NextResponse.json({ domains })
}

/**
 * POST /api/admin/settings/email/domains
 * Add a new email domain
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateDomainInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.domain) {
    return NextResponse.json(
      { error: 'Missing required field: domain' },
      { status: 400 }
    )
  }

  // RFC 1035 / RFC 2181 domain validation constants
  const MAX_DOMAIN_LENGTH = 253  // Total domain name max length
  const MAX_LABEL_LENGTH = 63   // Individual label (between dots) max length
  const MIN_LABEL_LENGTH = 1    // Labels must have at least one character

  // Check total domain length
  if (body.domain.length > MAX_DOMAIN_LENGTH) {
    return NextResponse.json(
      { error: `Domain name exceeds maximum length of ${MAX_DOMAIN_LENGTH} characters` },
      { status: 400 }
    )
  }

  // Check for consecutive dots
  if (body.domain.includes('..')) {
    return NextResponse.json(
      { error: 'Domain name cannot contain consecutive dots' },
      { status: 400 }
    )
  }

  // Validate domain format with regex
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
  if (!domainRegex.test(body.domain)) {
    return NextResponse.json(
      { error: 'Invalid domain format. Domain must start and end with alphanumeric characters, and labels cannot start or end with hyphens.' },
      { status: 400 }
    )
  }

  // Validate each label (part between dots)
  const labels = body.domain.split('.')
  for (const label of labels) {
    if (label.length < MIN_LABEL_LENGTH) {
      return NextResponse.json(
        { error: 'Domain labels (parts between dots) must have at least one character' },
        { status: 400 }
      )
    }
    if (label.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        { error: `Domain label "${label}" exceeds maximum length of ${MAX_LABEL_LENGTH} characters` },
        { status: 400 }
      )
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return NextResponse.json(
        { error: `Domain label "${label}" cannot start or end with a hyphen` },
        { status: 400 }
      )
    }
  }

  // Validate subdomain format if provided
  if (body.subdomain) {
    // Check subdomain length
    if (body.subdomain.length > MAX_LABEL_LENGTH) {
      return NextResponse.json(
        { error: `Subdomain exceeds maximum length of ${MAX_LABEL_LENGTH} characters` },
        { status: 400 }
      )
    }

    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i
    if (!subdomainRegex.test(body.subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Subdomain must start and end with alphanumeric characters.' },
        { status: 400 }
      )
    }

    // Check for leading/trailing hyphens
    if (body.subdomain.startsWith('-') || body.subdomain.endsWith('-')) {
      return NextResponse.json(
        { error: 'Subdomain cannot start or end with a hyphen' },
        { status: 400 }
      )
    }
  }

  try {
    // Create domain in database
    const domain = await createDomain(tenantSlug, {
      domain: body.domain.toLowerCase(),
      subdomain: body.subdomain?.toLowerCase() ?? null,
    })

    // Register with Resend to get DNS records
    const resendConfig = getResendConfig()
    if (resendConfig) {
      const result = await registerDomainWithResend(tenantSlug, domain, resendConfig)

      if (!result.success) {
        // Domain created but Resend registration failed
        // Return domain anyway, user can retry verification later
        return NextResponse.json(
          {
            domain,
            warning: `Domain created but Resend registration failed: ${result.error}`,
          },
          { status: 201 }
        )
      }

      // Refresh domain with DNS records
      const updatedDomains = await listDomains(tenantSlug)
      const updatedDomain = updatedDomains.find((d) => d.id === domain.id)

      return NextResponse.json({ domain: updatedDomain ?? domain }, { status: 201 })
    }

    return NextResponse.json({ domain }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create domain'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
