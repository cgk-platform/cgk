/**
 * Shopify Checkout Webhooks Handler
 *
 * Handles:
 * - checkouts/create - New checkout started
 * - checkouts/update - Checkout updated (may include completion)
 *
 * @ai-pattern webhook-handler
 * @ai-critical Validate HMAC signature before processing
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { withTenant, sql } from '@cgk-platform/db'
import { sendJob } from '@cgk-platform/jobs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Shopify checkout webhook payload
interface CheckoutWebhookPayload {
  id: number
  token: string
  cart_token?: string
  email?: string
  phone?: string
  gateway?: string
  customer?: {
    id: number
    email: string
    first_name?: string
    last_name?: string
  }
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  line_items: Array<{
    id: number
    title: string
    variant_title?: string
    quantity: number
    price: string
    sku?: string
    product_id?: number
    variant_id?: number
    image_url?: string
    requires_shipping?: boolean
  }>
  billing_address?: {
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    province_code?: string
    country?: string
    country_code?: string
    zip?: string
    phone?: string
  }
  shipping_address?: {
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    province_code?: string
    country?: string
    country_code?: string
    zip?: string
    phone?: string
  }
  abandoned_checkout_url?: string
  created_at: string
  updated_at?: string
  completed_at?: string | null
}

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac),
  )
}

/**
 * Get tenant info from Shopify shop domain
 */
async function getTenantFromShopDomain(shopDomain: string): Promise<{ slug: string } | null> {
  // Query public schema for tenant by shop domain
  const result = await sql`
    SELECT slug FROM organizations
    WHERE shopify_store_domain = ${shopDomain}
    LIMIT 1
  `

  if (result.rows.length === 0) return null
  return { slug: result.rows[0]!.slug as string }
}

export async function POST(request: Request) {
  const shopDomain = request.headers.get('x-shopify-shop-domain')
  const webhookTopic = request.headers.get('x-shopify-topic')
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256')

  if (!shopDomain || !webhookTopic) {
    return NextResponse.json(
      { error: 'Missing required Shopify headers' },
      { status: 400 },
    )
  }

  // Get raw body for HMAC verification
  const rawBody = await request.text()

  // Get tenant from shop domain
  const tenant = await getTenantFromShopDomain(shopDomain)
  if (!tenant) {
    console.warn(`[Webhook] Unknown shop domain: ${shopDomain}`)
    return NextResponse.json(
      { error: 'Unknown shop' },
      { status: 404 },
    )
  }

  // Get webhook secret for this tenant
  const webhookSecret = await withTenant(tenant.slug, async () => {
    const settings = await sql`
      SELECT shopify_webhook_secret FROM tenant_settings LIMIT 1
    `
    const row = settings.rows[0] as { shopify_webhook_secret?: string } | undefined
  return row?.shopify_webhook_secret
  })

  // Verify HMAC if secret is configured
  if (webhookSecret) {
    const isValid = verifyWebhookSignature(rawBody, hmacHeader, webhookSecret)
    if (!isValid) {
      console.warn(`[Webhook] Invalid HMAC signature for ${shopDomain}`)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      )
    }
  }

  // Parse the webhook payload
  let payload: CheckoutWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    )
  }

  console.log(`[Webhook] Received ${webhookTopic} for shop ${shopDomain}`)

  try {
    switch (webhookTopic) {
      case 'checkouts/create':
        await handleCheckoutCreate(tenant.slug, payload)
        break

      case 'checkouts/update':
        await handleCheckoutUpdate(tenant.slug, payload)
        break

      default:
        console.warn(`[Webhook] Unhandled checkout topic: ${webhookTopic}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[Webhook] Error processing ${webhookTopic}:`, error)
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 },
    )
  }
}

/**
 * Handle checkouts/create webhook
 */
async function handleCheckoutCreate(
  tenantSlug: string,
  payload: CheckoutWebhookPayload,
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const shopifyCheckoutId = String(payload.id)
    const totalCents = Math.round(parseFloat(payload.total_price) * 100)

    // Convert line items
    const lineItems = payload.line_items.map((item) => ({
      id: String(item.id),
      title: item.title,
      variantTitle: item.variant_title,
      quantity: item.quantity,
      price: Math.round(parseFloat(item.price) * 100),
      currency: payload.currency,
      imageUrl: item.image_url,
      sku: item.sku,
      productId: item.product_id ? String(item.product_id) : undefined,
      variantId: item.variant_id ? String(item.variant_id) : undefined,
    }))

    const customerName = payload.customer
      ? [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(' ')
      : null

    // Insert or update the checkout
    await sql`
      INSERT INTO abandoned_checkouts (
        shopify_checkout_id,
        shopify_checkout_token,
        customer_email,
        customer_phone,
        customer_id,
        customer_name,
        cart_total_cents,
        currency_code,
        line_items,
        billing_address,
        shipping_address,
        recovery_url,
        abandoned_at,
        status
      ) VALUES (
        ${shopifyCheckoutId},
        ${payload.token},
        ${payload.email || payload.customer?.email || null},
        ${payload.phone || null},
        ${payload.customer?.id ? String(payload.customer.id) : null},
        ${customerName},
        ${totalCents},
        ${payload.currency},
        ${JSON.stringify(lineItems)},
        ${payload.billing_address ? JSON.stringify(payload.billing_address) : null},
        ${payload.shipping_address ? JSON.stringify(payload.shipping_address) : null},
        ${payload.abandoned_checkout_url || null},
        ${payload.created_at},
        'abandoned'
      )
      ON CONFLICT (shopify_checkout_id) DO UPDATE SET
        shopify_checkout_token = EXCLUDED.shopify_checkout_token,
        customer_email = EXCLUDED.customer_email,
        customer_phone = EXCLUDED.customer_phone,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        cart_total_cents = EXCLUDED.cart_total_cents,
        currency_code = EXCLUDED.currency_code,
        line_items = EXCLUDED.line_items,
        billing_address = EXCLUDED.billing_address,
        shipping_address = EXCLUDED.shipping_address,
        recovery_url = EXCLUDED.recovery_url,
        updated_at = NOW()
    `
  })
}

/**
 * Handle checkouts/update webhook
 */
async function handleCheckoutUpdate(
  tenantSlug: string,
  payload: CheckoutWebhookPayload,
): Promise<void> {
  const shopifyCheckoutId = String(payload.id)
  const isCompleted = payload.completed_at !== null && payload.completed_at !== undefined

  if (isCompleted) {
    // Checkout was completed - mark as recovered
    await withTenant(tenantSlug, async () => {
      await sql`
        UPDATE abandoned_checkouts
        SET status = 'recovered',
            recovered_at = NOW(),
            updated_at = NOW()
        WHERE shopify_checkout_id = ${shopifyCheckoutId}
          AND status = 'abandoned'
      `

      // Cancel any pending recovery emails
      await sql`
        UPDATE recovery_email_queue
        SET status = 'cancelled'
        WHERE abandoned_checkout_id = (
          SELECT id FROM abandoned_checkouts WHERE shopify_checkout_id = ${shopifyCheckoutId}
        )
        AND status = 'scheduled'
      `
    })

    // Notify that checkout was recovered
    // Note: The 'recovery.checkoutUpdated' event is defined in @cgk-platform/jobs events.ts
    await sendJob('recovery.checkoutUpdated', {
      tenantId: tenantSlug,
      shopifyCheckoutId,
      completed: true,
    })
  } else {
    // Just an update - refresh the checkout data
    await handleCheckoutCreate(tenantSlug, payload)
  }
}
