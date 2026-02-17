export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createAdminClient,
  getShopifyCredentials,
  isShopifyConnected,
} from '@cgk-platform/shopify'

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
 * Create Shopify draft order via Admin API GraphQL
 */
async function createShopifyDraftOrder(
  tenantSlug: string,
  creatorId: string,
  products: CreateShipmentParams['products'],
  shippingAddress: CreateShipmentParams['shippingAddress'],
  notes?: string
): Promise<{ draftOrderId: string; orderId: string; orderNumber: string }> {
  // Get Shopify credentials
  const credentials = await getShopifyCredentials(tenantSlug)

  // Create Admin client
  const admin = createAdminClient({
    storeDomain: credentials.shop,
    adminAccessToken: credentials.accessToken,
    apiVersion: credentials.apiVersion,
  })

  // Build line items with 100% discount for creator samples
  const lineItems = products.map((p) => ({
    variantId: p.variantId.startsWith('gid://')
      ? p.variantId
      : `gid://shopify/ProductVariant/${p.variantId}`,
    quantity: p.quantity,
  }))

  // GraphQL mutation to create draft order
  const mutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const input = {
    lineItems,
    shippingAddress: {
      address1: shippingAddress.line1,
      address2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      provinceCode: shippingAddress.state,
      zip: shippingAddress.postalCode,
      countryCode: shippingAddress.country,
    },
    note: notes || `Creator sample shipment for creator ${creatorId}`,
    tags: ['UGC', 'creator-sample', `creator:${creatorId}`],
    // Apply 100% discount for creator samples
    appliedDiscount: {
      description: 'Creator Sample - 100% Discount',
      valueType: 'PERCENTAGE',
      value: 100,
    },
  }

  const result = await admin.query<{
    draftOrderCreate: {
      draftOrder: { id: string; name: string } | null
      userErrors: Array<{ field: string; message: string }>
    }
  }>(mutation, { input })

  if (result.draftOrderCreate.userErrors.length > 0) {
    throw new Error(result.draftOrderCreate.userErrors[0]?.message || 'Failed to create draft order')
  }

  if (!result.draftOrderCreate.draftOrder) {
    throw new Error('Draft order creation failed: no draft order returned')
  }

  const draftOrderId = result.draftOrderCreate.draftOrder.id
  const draftOrderName = result.draftOrderCreate.draftOrder.name

  // Complete the draft order to create an actual order
  const completeMutation = `
    mutation draftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder {
          id
          order {
            id
            name
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const completeResult = await admin.query<{
    draftOrderComplete: {
      draftOrder: { id: string; order: { id: string; name: string } | null } | null
      userErrors: Array<{ field: string; message: string }>
    }
  }>(completeMutation, { id: draftOrderId })

  if (completeResult.draftOrderComplete.userErrors.length > 0) {
    throw new Error(
      completeResult.draftOrderComplete.userErrors[0]?.message || 'Failed to complete draft order'
    )
  }

  const order = completeResult.draftOrderComplete.draftOrder?.order
  if (!order) {
    // If order completion failed, return draft order info
    return {
      draftOrderId,
      orderId: draftOrderId,
      orderNumber: draftOrderName,
    }
  }

  return {
    draftOrderId,
    orderId: order.id,
    orderNumber: order.name,
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
    // Create the shipment record first
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

    // Check if Shopify is connected
    const shopifyConnected = await isShopifyConnected(tenantSlug)

    if (!shopifyConnected) {
      // Return shipment without Shopify order if not connected
      return NextResponse.json({
        success: true,
        shipment,
        warning: 'Shopify is not connected. Shipment created but no order was placed.',
      })
    }

    // Create Shopify draft order
    const { draftOrderId, orderId, orderNumber } = await createShopifyDraftOrder(
      tenantSlug,
      creatorId,
      body.products,
      body.shippingAddress,
      body.notes
    )

    // Update shipment with Shopify order details
    const updatedShipment = await updateShipmentWithOrder(tenantSlug, shipment.id, {
      shopifyOrderId: orderId,
      shopifyOrderNumber: orderNumber,
      shopifyDraftOrderId: draftOrderId,
    })

    return NextResponse.json({
      success: true,
      shipment: updatedShipment || shipment,
      shopifyOrderId: orderId,
      shopifyOrderNumber: orderNumber,
    })
  } catch (error) {
    console.error('[shipments] POST error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle Shopify-specific errors
    if (errorMessage.includes('NOT_CONNECTED')) {
      return NextResponse.json(
        { error: 'Shopify is not connected. Please connect your Shopify store in Settings.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
