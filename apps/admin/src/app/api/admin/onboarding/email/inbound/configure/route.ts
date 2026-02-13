export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  configureInboundAddresses,
  getInboundCapableAddresses,
  getInboundRecommendations,
  getInboundWebhookUrl,
  type ConfigureInboundInput,
} from '@cgk-platform/communications'

/**
 * GET /api/admin/onboarding/email/inbound/configure
 * Get inbound email configuration options
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Get base URL from request
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  // Get inbound-capable addresses
  const addresses = await withTenant(tenantSlug, () =>
    getInboundCapableAddresses()
  )

  // Get webhook URL
  const webhookInfo = getInboundWebhookUrl(baseUrl, tenantSlug)

  // Get recommendations
  const recommendations = getInboundRecommendations()

  return NextResponse.json({
    webhookInfo,
    addresses,
    recommendations,
  })
}

/**
 * POST /api/admin/onboarding/email/inbound/configure
 * Configure inbound email addresses
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: ConfigureInboundInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.addresses || !Array.isArray(body.addresses)) {
    return NextResponse.json(
      { error: 'Missing required field: addresses' },
      { status: 400 }
    )
  }

  // Validate each address config
  for (const config of body.addresses) {
    if (!config.senderAddressId) {
      return NextResponse.json(
        { error: 'Each address config must have senderAddressId' },
        { status: 400 }
      )
    }
    if (typeof config.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Each address config must have enabled boolean' },
        { status: 400 }
      )
    }
  }

  const result = await withTenant(tenantSlug, () =>
    configureInboundAddresses(body.addresses)
  )

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        updated: result.updated,
        errors: result.errors,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    updated: result.updated,
  })
}
