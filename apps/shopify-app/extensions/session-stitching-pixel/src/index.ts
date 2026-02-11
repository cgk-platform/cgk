/**
 * Session Stitching Web Pixel Extension
 *
 * Captures session identifiers from cart attributes and sends server-side events
 * to GA4 Measurement Protocol and Meta CAPI. Enables accurate attribution across
 * Shopify checkout for the CGK platform.
 */

import { register } from '@shopify/web-pixels-extension'

/**
 * Extension settings interface
 */
interface PixelSettings {
  ga4_measurement_id?: string
  ga4_api_secret?: string
  meta_pixel_id?: string
  meta_access_token?: string
  platform_api_url?: string
  enable_debug?: boolean
}

/**
 * Cart attribute for session identifiers
 */
interface CartAttribute {
  key: string
  value: string
}

/**
 * Line item structure from checkout events
 */
interface LineItem {
  title: string
  quantity: number
  variant?: {
    id: string
    title?: string
    price?: {
      amount: string
    }
    product?: {
      id: string
      title?: string
    }
  }
}

/**
 * Checkout/order data structure
 */
interface CheckoutData {
  token?: string
  email?: string
  attributes?: CartAttribute[]
  totalPrice?: {
    amount: string
  }
  totalTax?: {
    amount: string
  }
  shippingLine?: {
    title?: string
    price?: {
      amount: string
    }
  }
  lineItems?: LineItem[]
  order?: {
    id?: string
    name?: string
  }
}

register(({ analytics, browser, init, settings }: {
  analytics: {
    subscribe: (event: string, callback: (event: { data: { checkout?: CheckoutData } }) => void | Promise<void>) => void
  }
  browser: {
    cookie: {
      get: (name: string) => Promise<string | null>
      set: (name: string, value: string) => Promise<void>
    }
  }
  init: {
    data: {
      cart?: {
        attributes?: CartAttribute[]
      }
    }
  }
  settings: PixelSettings
}) => {
  // Configuration from extension settings
  const GA4_MEASUREMENT_ID = settings.ga4_measurement_id
  const GA4_API_SECRET = settings.ga4_api_secret
  const META_PIXEL_ID = settings.meta_pixel_id
  const META_ACCESS_TOKEN = settings.meta_access_token
  const PLATFORM_API_URL = settings.platform_api_url
  const DEBUG_MODE = settings.enable_debug ?? false

  // Captured session identifiers
  let ga4ClientId: string | null = null
  let ga4SessionId: string | null = null
  let metaFbp: string | null = null
  let metaFbc: string | null = null
  let metaExternalId: string | null = null

  /**
   * Debug logging helper
   */
  function debugLog(message: string, data?: unknown): void {
    if (DEBUG_MODE) {
      console.log(`[CGK Pixel] ${message}`, data ?? '')
    }
  }

  // ========================================
  // Session Identifier Extraction
  // ========================================

  /**
   * Extracts session identifiers from checkout attributes
   * These are set by the storefront before checkout
   */
  function extractSessionData(checkout: CheckoutData | undefined): void {
    const attributes = checkout?.attributes || []

    // GA4 identifiers
    const ga4ClientAttr = attributes.find((a) => a.key === '_ga4_client_id')
    const ga4SessionAttr = attributes.find((a) => a.key === '_ga4_session_id')
    if (ga4ClientAttr?.value) ga4ClientId = ga4ClientAttr.value
    if (ga4SessionAttr?.value) ga4SessionId = ga4SessionAttr.value

    // Meta identifiers
    const fbpAttr = attributes.find((a) => a.key === '_meta_fbp')
    const fbcAttr = attributes.find((a) => a.key === '_meta_fbc')
    const externalIdAttr = attributes.find((a) => a.key === '_meta_external_id')
    if (fbpAttr?.value) metaFbp = fbpAttr.value
    if (fbcAttr?.value) metaFbc = fbcAttr.value
    if (externalIdAttr?.value) metaExternalId = externalIdAttr.value

    debugLog('Session data extracted', {
      ga4ClientId,
      ga4SessionId,
      metaFbp,
      metaFbc,
      metaExternalId
    })
  }

  // ========================================
  // GA4 Measurement Protocol
  // ========================================

  /**
   * Sends an event to GA4 via Measurement Protocol
   */
  async function sendGA4Event(
    eventName: string,
    params: Record<string, unknown>
  ): Promise<void> {
    if (!ga4ClientId || !GA4_API_SECRET || !GA4_MEASUREMENT_ID) {
      debugLog('GA4 skipped - missing configuration')
      return
    }

    const payload = {
      client_id: ga4ClientId,
      events: [{
        name: eventName,
        params: {
          ...params,
          session_id: ga4SessionId,
          engagement_time_msec: 100,
          event_source: 'cgk_pixel',
        }
      }]
    }

    debugLog(`Sending GA4 event: ${eventName}`, payload)

    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          keepalive: true,
        }
      )
      debugLog(`GA4 event sent: ${eventName}`)
    } catch (error) {
      console.error('[CGK Pixel] GA4 error:', error)
    }
  }

  // ========================================
  // Meta Conversions API
  // ========================================

  /**
   * Hashes a string using SHA-256 for Meta CAPI compliance
   */
  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Sends an event to Meta Conversions API
   */
  async function sendMetaEvent(
    eventName: string,
    checkout: CheckoutData | undefined,
    customData: Record<string, unknown>
  ): Promise<void> {
    if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
      debugLog('Meta skipped - missing configuration')
      return
    }

    const orderId = checkout?.order?.id?.replace('gid://shopify/Order/', '') || checkout?.token
    const eventId = `cgk_${eventName.toLowerCase()}_${orderId}_${Date.now()}`

    // Build user data with available identifiers
    const userData: Record<string, unknown> = {}
    if (metaFbp) userData.fbp = metaFbp
    if (metaFbc) userData.fbc = metaFbc
    if (metaExternalId) userData.external_id = [await sha256(metaExternalId)]
    if (checkout?.email) userData.em = [await sha256(checkout.email)]

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        user_data: userData,
        custom_data: customData,
      }],
      access_token: META_ACCESS_TOKEN,
    }

    debugLog(`Sending Meta event: ${eventName}`, payload)

    try {
      await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      debugLog(`Meta event sent: ${eventName}`)
    } catch (error) {
      console.error('[CGK Pixel] Meta error:', error)
    }
  }

  // ========================================
  // Platform Event Forwarding
  // ========================================

  /**
   * Forwards events to the CGK platform API for additional processing
   */
  async function sendPlatformEvent(
    eventName: string,
    checkout: CheckoutData | undefined,
    additionalData: Record<string, unknown>
  ): Promise<void> {
    if (!PLATFORM_API_URL) {
      return
    }

    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      checkout_token: checkout?.token,
      order_id: checkout?.order?.id,
      session: {
        ga4_client_id: ga4ClientId,
        ga4_session_id: ga4SessionId,
        meta_fbp: metaFbp,
        meta_fbc: metaFbc,
        meta_external_id: metaExternalId,
      },
      ...additionalData,
    }

    debugLog(`Sending platform event: ${eventName}`, payload)

    try {
      await fetch(`${PLATFORM_API_URL}/api/events/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    } catch (error) {
      console.error('[CGK Pixel] Platform API error:', error)
    }
  }

  // ========================================
  // Event Handlers
  // ========================================

  // Initialize from cart if available
  if (init.data.cart) {
    extractSessionData({ attributes: init.data.cart.attributes })
    debugLog('Initialized from cart data')
  }

  // Checkout Started
  analytics.subscribe('checkout_started', async (event) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || '0')
    const items = formatItemsForGA4(checkout?.lineItems || [])

    await Promise.all([
      sendGA4Event('begin_checkout', {
        currency: 'USD',
        value,
        items,
      }),
      sendMetaEvent('InitiateCheckout', checkout, {
        value,
        currency: 'USD',
        content_ids: formatContentIds(checkout?.lineItems || []),
        content_type: 'product',
      }),
      sendPlatformEvent('checkout_started', checkout, { value }),
    ])
  })

  // Shipping Info Submitted
  analytics.subscribe('checkout_shipping_info_submitted', async (event) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || '0')

    await sendGA4Event('add_shipping_info', {
      currency: 'USD',
      value,
      shipping_tier: checkout?.shippingLine?.title || 'Standard',
      items: formatItemsForGA4(checkout?.lineItems || []),
    })

    await sendPlatformEvent('shipping_info_submitted', checkout, {
      value,
      shipping_method: checkout?.shippingLine?.title,
    })
  })

  // Payment Info Submitted
  analytics.subscribe('payment_info_submitted', async (event) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || '0')

    await Promise.all([
      sendGA4Event('add_payment_info', {
        currency: 'USD',
        value,
        payment_type: 'credit_card',
        items: formatItemsForGA4(checkout?.lineItems || []),
      }),
      sendMetaEvent('AddPaymentInfo', checkout, {
        value,
        currency: 'USD',
        content_ids: formatContentIds(checkout?.lineItems || []),
        content_type: 'product',
      }),
      sendPlatformEvent('payment_info_submitted', checkout, { value }),
    ])
  })

  // Purchase Complete
  analytics.subscribe('checkout_completed', async (event) => {
    const checkout = event.data.checkout
    extractSessionData(checkout)

    const value = parseFloat(checkout?.totalPrice?.amount || '0')
    const tax = parseFloat(checkout?.totalTax?.amount || '0')
    const shipping = parseFloat(checkout?.shippingLine?.price?.amount || '0')
    const transactionId = checkout?.order?.id?.replace('gid://shopify/Order/', '') || checkout?.token

    await Promise.all([
      sendGA4Event('purchase', {
        transaction_id: transactionId,
        value,
        tax,
        shipping,
        currency: 'USD',
        items: formatItemsForGA4(checkout?.lineItems || []),
      }),
      sendMetaEvent('Purchase', checkout, {
        value,
        currency: 'USD',
        content_ids: formatContentIds(checkout?.lineItems || []),
        content_type: 'product',
        order_id: transactionId,
      }),
      sendPlatformEvent('purchase_completed', checkout, {
        value,
        tax,
        shipping,
        transaction_id: transactionId,
      }),
    ])
  })

  // ========================================
  // Utility Functions
  // ========================================

  /**
   * Formats line items for GA4 item array
   */
  function formatItemsForGA4(lineItems: LineItem[]): Record<string, unknown>[] {
    return lineItems.map((item, index) => ({
      item_id: `shopify_${item.variant?.product?.id || 'unknown'}_${item.variant?.id || 'unknown'}`,
      item_name: item.variant?.product?.title || item.title,
      item_variant: item.variant?.title,
      price: parseFloat(item.variant?.price?.amount || '0'),
      quantity: item.quantity,
      index,
    }))
  }

  /**
   * Formats content IDs for Meta CAPI
   */
  function formatContentIds(lineItems: LineItem[]): string[] {
    return lineItems.map(item =>
      `shopify_${item.variant?.product?.id || 'unknown'}_${item.variant?.id || 'unknown'}`
    )
  }

  debugLog('Session stitching pixel registered')
})
