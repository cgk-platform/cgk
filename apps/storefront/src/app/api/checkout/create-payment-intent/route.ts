/**
 * Create Payment Intent API Route
 *
 * POST /api/checkout/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the checkout flow.
 * Uses tenant's Stripe credentials via getTenantStripeClient().
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantStripeClient, getTenantStripeConfig } from '@cgk-platform/integrations'
import { withTenant, sql } from '@cgk-platform/db'

import { getTenantSlug, getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CreatePaymentIntentRequest {
  cartId: string
  email: string
  shippingAddress?: {
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
    price: number
  }
}

interface CartLineItem {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    sku?: string
    price: {
      amount: string
      currencyCode: string
    }
    image?: {
      url: string
      altText?: string
    }
  }
}

interface CartData {
  id: string
  total_cents: number
  currency: string
  line_items: CartLineItem[]
  subtotal_cents: number
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

    const body = (await request.json()) as CreatePaymentIntentRequest
    const { cartId, email, shippingAddress, shippingMethod } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get tenant's Stripe client
    const stripe = await getTenantStripeClient(tenantSlug)
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment provider not configured for this store' },
        { status: 503 }
      )
    }

    // Get tenant's Stripe config for publishable key
    const stripeConfig = await getTenantStripeConfig(tenantSlug)
    if (!stripeConfig?.publishableKey) {
      return NextResponse.json(
        { error: 'Stripe publishable key not configured' },
        { status: 503 }
      )
    }

    // Get cart data from database
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
          AND (expires_at IS NULL OR expires_at > NOW())
      `
      return result.rows[0]
    })

    if (!cartData) {
      return NextResponse.json(
        { error: 'Cart not found or expired' },
        { status: 404 }
      )
    }

    // Calculate total with shipping
    const shippingCents = shippingMethod?.price
      ? Math.round(shippingMethod.price * 100)
      : 0
    const totalCents = cartData.total_cents + shippingCents

    if (totalCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid cart total' },
        { status: 400 }
      )
    }

    // Get tenant config for metadata
    const tenantConfig = await getTenantConfig()

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: cartData.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        cartId,
        tenantSlug,
        tenantName: tenantConfig?.name ?? tenantSlug,
        email,
        shippingMethodId: shippingMethod?.id ?? '',
      },
      receipt_email: email,
      shipping: shippingAddress
        ? {
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            address: {
              line1: shippingAddress.address1,
              line2: shippingAddress.address2 ?? undefined,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.zip,
              country: shippingAddress.country,
            },
          }
        : undefined,
    })

    // Store payment intent ID in cart for later reference
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE carts
        SET
          payment_intent_id = ${paymentIntent.id},
          customer_email = ${email},
          shipping_address = ${JSON.stringify(shippingAddress ?? null)},
          shipping_method = ${JSON.stringify(shippingMethod ?? null)},
          updated_at = NOW()
        WHERE id = ${cartId}
      `
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: stripeConfig.publishableKey,
      amount: totalCents,
      currency: cartData.currency,
    })
  } catch (error) {
    console.error('[create-payment-intent] Error:', error)

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string }
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          { error: stripeError.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
