export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createOnboardingSenderAddress,
  getRecommendedSenders,
  type CreateSenderInput,
} from '@cgk-platform/communications'

/**
 * GET /api/admin/onboarding/email/addresses/create
 * Get recommended sender addresses for onboarding
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const brandName = url.searchParams.get('brandName') ?? 'Your Brand'

  const recommendations = await withTenant(tenantSlug, () =>
    getRecommendedSenders(brandName)
  )

  return NextResponse.json({ recommendations })
}

/**
 * POST /api/admin/onboarding/email/addresses/create
 * Create a sender address during onboarding
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateSenderInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.domainId) {
    return NextResponse.json(
      { error: 'Missing required field: domainId' },
      { status: 400 }
    )
  }

  if (!body.localPart) {
    return NextResponse.json(
      { error: 'Missing required field: localPart' },
      { status: 400 }
    )
  }

  if (!body.displayName) {
    return NextResponse.json(
      { error: 'Missing required field: displayName' },
      { status: 400 }
    )
  }

  if (!body.purpose) {
    return NextResponse.json(
      { error: 'Missing required field: purpose' },
      { status: 400 }
    )
  }

  // Validate local part format
  const localPartRegex = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i
  if (!localPartRegex.test(body.localPart)) {
    return NextResponse.json(
      { error: 'Invalid email address format' },
      { status: 400 }
    )
  }

  // Validate purpose
  const validPurposes = ['transactional', 'creator', 'support', 'treasury', 'system']
  if (!validPurposes.includes(body.purpose)) {
    return NextResponse.json(
      { error: 'Invalid purpose. Must be one of: ' + validPurposes.join(', ') },
      { status: 400 }
    )
  }

  try {
    const address = await withTenant(tenantSlug, () =>
      createOnboardingSenderAddress(body)
    )

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create sender address'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
