/**
 * Confirm Order API Route
 *
 * POST /api/checkout/confirm-order
 *
 * After payment is confirmed, this route creates the order in the database.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantStripeClient } from '@cgk-platform/integrations'
import { withTenant, sql } from '@cgk-platform/db'

import { getTenantSlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ConfirmOrderRequest {
  paymentIntentId: string
  cartId: string
  email: string
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
    phone?: string
  }
  billingAddress?: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
  }
  shippingMethod?: {
    id: string
    name: string
    price: number
  }
}

interface CartData {
  id: string
  total_cents: number
  subtotal_cents: number
  currency: string
  line_items: Array<{
    id: string
    quantity: number
    merchandise: {
      id: string
      title: string
      sku?: string
      price: { amount: string; currencyCode: string }
      image?: { url: string; altText?: string }
    }
  }>
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantSlug = await getTenantSlug()
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as ConfirmOrderRequest
    const { paymentIntentId, cartId, email, shippingAddress, billingAddress, shippingMethod } = body

    if (!paymentIntentId || !cartId) {
      return NextResponse.json(
        { error: 'Payment intent ID and cart ID are required' },
        { status: 400 }
      )
    }

    // Get tenant's Stripe client to verify payment
    const stripe = await getTenantStripeClient(tenantSlug)
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment provider not configured' },
        { status: 503 }
      )
    }

    // Verify payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${paymentIntent.status}` },
        { status: 400 }
      )
    }

    // Get cart data
    const cartData = await withTenant(tenantSlug, async () => {
      const result = await sql<CartData>`
        SELECT
          id,
          total_cents,
          subtotal_cents,
          currency,
          line_items
        FROM carts
        WHERE id = ${cartId}
      `
      return result.rows[0]
    })

    if (!cartData) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      )
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Calculate shipping
    const shippingCents = shippingMethod?.price
      ? Math.round(shippingMethod.price * 100)
      : 0

    // Create order in database
    await withTenant(tenantSlug, async () => {
      await sql`
        INSERT INTO orders (
          id,
          order_number,
          customer_email,
          status,
          fulfillment_status,
          financial_status,
          subtotal_cents,
          shipping_cents,
          tax_cents,
          discount_cents,
          total_cents,
          currency,
          line_items,
          shipping_address,
          billing_address,
          payment_intent_id,
          order_placed_at,
          created_at,
          updated_at
        ) VALUES (
          ${orderId},
          ${orderNumber},
          ${email},
          'confirmed',
          'unfulfilled',
          'paid',
          ${cartData.subtotal_cents},
          ${shippingCents},
          ${0},
          ${0},
          ${cartData.total_cents + shippingCents},
          ${cartData.currency},
          ${JSON.stringify(cartData.line_items)},
          ${JSON.stringify(shippingAddress)},
          ${JSON.stringify(billingAddress ?? shippingAddress)},
          ${paymentIntentId},
          NOW(),
          NOW(),
          NOW()
        )
      `

      // Clear the cart
      await sql`
        DELETE FROM carts
        WHERE id = ${cartId}
      `
    })

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      redirectUrl: `/order-confirmation/${orderId}`,
    })
  } catch (error) {
    console.error('[confirm-order] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
