export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  generateDNSInstructions,
  getCommonRegistrars,
  getDomainById,
  getProviderInstructions,
} from '@cgk-platform/communications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/settings/email/domains/[id]/dns
 * Get DNS setup instructions for a domain
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get domain
  const domain = await getDomainById(tenantSlug, id)

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  // Get optional provider from query
  const url = new URL(request.url)
  const provider = url.searchParams.get('provider')

  // Generate instructions
  const instructions = generateDNSInstructions(domain)

  // Add provider-specific instructions if requested
  let providerInstructions: string | undefined
  if (provider) {
    providerInstructions = getProviderInstructions(provider)
  }

  return NextResponse.json({
    instructions,
    providerInstructions,
    registrars: getCommonRegistrars(),
  })
}
