export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createShipment,
  getCreatorShipments,
  updateShipmentWithOrder,
} from '@/lib/creators/lifecycle-db'
import type { CreateShipmentParams } from '@/lib/creators/lifecycle-types'

/**
 * GET /api/admin/creators/[id]/shipments
 * Returns all shipments for a creator
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: creatorId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const shipments = await getCreatorShipments(tenantSlug, creatorId)
    return NextResponse.json({ shipments })
  } catch (error) {
    console.error('[shipments] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }
}

/**
 * POST /api/admin/creators/[id]/shipments
 * Creates a new shipment (Shopify draft order)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: creatorId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id') || 'unknown'

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<CreateShipmentParams>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: 'products array is required' }, { status: 400 })
  }

  if (!body.shippingAddress) {
    return NextResponse.json({ error: 'shippingAddress is required' }, { status: 400 })
  }

  // Validate product quantities (max 5 per variant)
  for (const product of body.products) {
    if (!product.variantId || !product.title || !product.quantity) {
      return NextResponse.json(
        { error: 'Each product must have variantId, title, and quantity' },
        { status: 400 }
      )
    }
    if (product.quantity < 1 || product.quantity > 5) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 5 per variant' },
        { status: 400 }
      )
    }
  }

  // Validate address
  const addr = body.shippingAddress
  if (!addr.line1 || !addr.city || !addr.state || !addr.postalCode || !addr.country) {
    return NextResponse.json(
      { error: 'Shipping address must have line1, city, state, postalCode, and country' },
      { status: 400 }
    )
  }

  try {
    // Create the shipment record
    const shipment = await createShipment(
      tenantSlug,
      {
        creatorId,
        products: body.products,
        shippingAddress: body.shippingAddress,
        notes: body.notes,
      },
      userId
    )

    // In a full implementation, this would:
    // 1. Create a Shopify draft order with 100% discount
    // 2. Add tags: ['UGC', 'creator-sample', `creator:${creatorId}`]
    // 3. Complete the draft order
    // 4. Update the shipment record with Shopify order details

    // For now, simulate Shopify order creation
    const mockOrderId = `gid://shopify/Order/${Date.now()}`
    const mockOrderNumber = `CS${Math.floor(Math.random() * 10000)}`

    const updatedShipment = await updateShipmentWithOrder(tenantSlug, shipment.id, {
      shopifyOrderId: mockOrderId,
      shopifyOrderNumber: mockOrderNumber,
      shopifyDraftOrderId: `gid://shopify/DraftOrder/${Date.now()}`,
    })

    return NextResponse.json({
      success: true,
      shipment: updatedShipment || shipment,
      shopifyOrderId: mockOrderId,
      shopifyOrderNumber: mockOrderNumber,
    })
  } catch (error) {
    console.error('[shipments] POST error:', error)
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
