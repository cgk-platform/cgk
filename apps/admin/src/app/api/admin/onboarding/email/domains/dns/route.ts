export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getDomainDNSInstructions,
  getDomainsWithStatus,
  getRecommendedSubdomains,
} from '@cgk/communications'

/**
 * GET /api/admin/onboarding/email/domains/dns
 * Get DNS instructions for all domains
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const domainId = url.searchParams.get('domainId')
  const primaryDomain = url.searchParams.get('primaryDomain')

  // If specific domain requested
  if (domainId) {
    const instructions = await withTenant(tenantSlug, () =>
      getDomainDNSInstructions(domainId)
    )

    if (!instructions) {
      return NextResponse.json(
        { error: 'Domain not found or DNS records not available' },
        { status: 404 }
      )
    }

    return NextResponse.json({ instructions })
  }

  // If primary domain provided, return recommended subdomains
  if (primaryDomain) {
    const recommendations = getRecommendedSubdomains(primaryDomain)
    return NextResponse.json({ recommendations })
  }

  // Return all domains with their status
  const domains = await withTenant(tenantSlug, () => getDomainsWithStatus())

  // Get DNS instructions for each domain
  const domainsWithInstructions = await Promise.all(
    domains.map(async (domain) => {
      const instructions = await withTenant(tenantSlug, () =>
        getDomainDNSInstructions(domain.id)
      )
      return {
        ...domain,
        dnsInstructions: instructions,
      }
    })
  )

  return NextResponse.json({ domains: domainsWithInstructions })
}
