export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { bulkCreatePromoCodeMetadata } from '@/lib/promo-codes/db'
import type { BulkGenerateInput, CreatePromoCodeInput } from '@/lib/promo-codes/types'

/**
 * Generate a random alphanumeric code
 */
function generateRandomCode(prefix: string, length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded confusing chars: I, O, 0, 1
  let suffix = ''
  const randomBytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    suffix += chars[randomBytes[i]! % chars.length]
  }
  return `${prefix}${suffix}`
}

/**
 * POST /api/admin/promo-codes/bulk
 * Bulk generate promo code metadata entries
 *
 * Note: This creates metadata entries only. Actual Shopify discounts
 * should be created separately via Shopify Admin API.
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: BulkGenerateInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate input
  if (!body.prefix) {
    return NextResponse.json({ error: 'Prefix is required' }, { status: 400 })
  }

  if (body.prefix.length < 2 || body.prefix.length > 10) {
    return NextResponse.json(
      { error: 'Prefix must be 2-10 characters' },
      { status: 400 },
    )
  }

  if (!body.quantity || body.quantity < 1 || body.quantity > 1000) {
    return NextResponse.json(
      { error: 'Quantity must be between 1 and 1000' },
      { status: 400 },
    )
  }

  try {
    const prefix = body.prefix.toUpperCase()
    const codes: CreatePromoCodeInput[] = []
    const generatedCodes = new Set<string>()

    // Generate unique codes
    let attempts = 0
    const maxAttempts = body.quantity * 3 // Allow some retries for collisions

    while (codes.length < body.quantity && attempts < maxAttempts) {
      const code = generateRandomCode(prefix)
      attempts++

      if (!generatedCodes.has(code)) {
        generatedCodes.add(code)
        codes.push({
          code,
          creator_id: body.creator_id,
          commission_percent: body.commission_percent,
        })
      }
    }

    if (codes.length < body.quantity) {
      return NextResponse.json(
        { error: 'Could not generate enough unique codes' },
        { status: 500 },
      )
    }

    // Bulk insert
    const created = await bulkCreatePromoCodeMetadata(tenantSlug, codes)

    // Generate CSV for download
    const csvLines = ['Code,Creator ID,Commission %']
    for (const promoCode of created) {
      csvLines.push(
        `${promoCode.code},${promoCode.creator_id || ''},${promoCode.commission_percent || ''}`,
      )
    }
    const csv = csvLines.join('\n')

    return NextResponse.json({
      success: true,
      created: created.length,
      codes: created.map((c) => c.code),
      csv,
    })
  } catch (error) {
    console.error('Error bulk creating promo codes:', error)
    return NextResponse.json(
      { error: 'Failed to bulk create promo codes' },
      { status: 500 },
    )
  }
}
