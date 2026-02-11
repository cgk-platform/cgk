export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  addOnboardingDomain,
  getResendConfig,
  isValidDomain,
  isValidSubdomain,
  type AddDomainInput,
} from '@cgk/communications'

/**
 * POST /api/admin/onboarding/email/domains/add
 * Add a domain during email onboarding
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: AddDomainInput & { resendApiKey?: string }
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
  if (!isValidDomain(body.domain)) {
    return NextResponse.json(
      { error: 'Invalid domain format' },
      { status: 400 }
    )
  }

  // Validate subdomain format if provided
  if (body.subdomain && !isValidSubdomain(body.subdomain)) {
    return NextResponse.json(
      { error: 'Invalid subdomain format' },
      { status: 400 }
    )
  }

  try {
    // Get Resend config - either from body or environment
    const resendConfig = body.resendApiKey
      ? { apiKey: body.resendApiKey }
      : getResendConfig()

    const result = await withTenant(tenantSlug, () =>
      addOnboardingDomain(
        {
          domain: body.domain.toLowerCase(),
          subdomain: body.subdomain?.toLowerCase() ?? null,
        },
        resendConfig ?? undefined
      )
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add domain'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
