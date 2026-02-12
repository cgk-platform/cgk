export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createPromoCodeMetadata,
  getPromoCodeList,
} from '@/lib/promo-codes/db'
import type { CreatePromoCodeInput } from '@/lib/promo-codes/types'

/**
 * GET /api/admin/promo-codes
 * List promo code metadata with optional filtering
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const search = searchParams.get('search') || undefined
  const creatorId = searchParams.get('creatorId') || undefined

  try {
    const result = await getPromoCodeList(tenantSlug, {
      limit,
      offset,
      search,
      creatorId,
    })

    return NextResponse.json({
      promoCodes: result.rows,
      totalCount: result.totalCount,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching promo codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/promo-codes
 * Create a new promo code metadata entry
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreatePromoCodeInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  try {
    const promoCode = await createPromoCodeMetadata(tenantSlug, body)
    return NextResponse.json({ promoCode }, { status: 201 })
  } catch (error) {
    console.error('Error creating promo code:', error)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A promo code with this code already exists' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 },
    )
  }
}
