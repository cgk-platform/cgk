export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  addOptOut,
  getOptOutStats,
  listOptOuts,
  maskPhoneNumber,
  normalizeToE164,
} from '@cgk-platform/communications'

/**
 * GET /api/admin/sms/opt-outs
 * List SMS opt-outs
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)

  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  const statsOnly = url.searchParams.get('statsOnly') === 'true'

  // Get stats
  const stats = await getOptOutStats(tenantSlug)

  if (statsOnly) {
    return NextResponse.json({ stats })
  }

  const { optOuts, total } = await listOptOuts(tenantSlug, {
    limit: limit ? parseInt(limit, 10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  })

  // Mask phone numbers for privacy
  const maskedOptOuts = optOuts.map((optOut) => ({
    ...optOut,
    phoneNumber: maskPhoneNumber(optOut.phoneNumber),
  }))

  return NextResponse.json({
    optOuts: maskedOptOuts,
    total,
    stats,
    pagination: {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      total,
      hasMore: (offset ? parseInt(offset, 10) : 0) + (limit ? parseInt(limit, 10) : 50) < total,
    },
  })
}

/**
 * POST /api/admin/sms/opt-outs
 * Manually add an opt-out
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { phoneNumber } = body

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  // Normalize phone number
  const normalized = normalizeToE164(phoneNumber)

  if (!normalized) {
    return NextResponse.json(
      { error: 'Invalid phone number format. Must be E.164 format (e.g., +15551234567)' },
      { status: 400 }
    )
  }

  const optOut = await addOptOut({
    tenantId: tenantSlug,
    phoneNumber: normalized,
    optOutMethod: 'admin',
  })

  return NextResponse.json(
    {
      optOut: {
        ...optOut,
        phoneNumber: maskPhoneNumber(optOut.phoneNumber),
      },
    },
    { status: 201 }
  )
}
