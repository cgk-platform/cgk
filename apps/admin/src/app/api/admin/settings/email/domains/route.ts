export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createDomain,
  getResendConfig,
  listDomains,
  registerDomainWithResend,
  type CreateDomainInput,
} from '@cgk/communications'

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

  const domains = await withTenant(tenantSlug, () => listDomains())

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

  // Validate domain format
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
  if (!domainRegex.test(body.domain)) {
    return NextResponse.json(
      { error: 'Invalid domain format' },
      { status: 400 }
    )
  }

  // Validate subdomain format if provided
  if (body.subdomain) {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i
    if (!subdomainRegex.test(body.subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      )
    }
  }

  try {
    // Create domain in database
    const domain = await withTenant(tenantSlug, () =>
      createDomain({
        domain: body.domain.toLowerCase(),
        subdomain: body.subdomain?.toLowerCase() ?? null,
      })
    )

    // Register with Resend to get DNS records
    const resendConfig = getResendConfig()
    if (resendConfig) {
      const result = await withTenant(tenantSlug, () =>
        registerDomainWithResend(domain, resendConfig)
      )

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
      const updatedDomains = await withTenant(tenantSlug, () => listDomains())
      const updatedDomain = updatedDomains.find((d) => d.id === domain.id)

      return NextResponse.json({ domain: updatedDomain ?? domain }, { status: 201 })
    }

    return NextResponse.json({ domain }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create domain'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
