/**
 * Webhook handler for orders/create
 *
 * Extracts bundle line items from the order and records them
 * to the CGK platform via the admin API.
 */
import type { ActionFunctionArgs } from '@remix-run/node'
import { authenticate } from '../shopify.server'
import { logger } from '@cgk-platform/logging'

interface OrderLineItem {
  id: number
  variant_id: number
  title: string
  quantity: number
  price: string
  properties: Array<{ name: string; value: string }>
}

interface OrderWebhookPayload {
  id: number
  order_number: number
  customer?: { id: number } | null
  line_items: OrderLineItem[]
  total_price: string
  total_discounts: string
  subtotal_price: string
}

interface BundleLineGroup {
  bundleId: string
  bundleTier: string
  bundleDiscount: string
  bundleDiscountType: string
  bundleSize: number
  items: OrderLineItem[]
  subtotalCents: number
  discountCents: number
}

function getLineProperty(item: OrderLineItem, key: string): string | undefined {
  if (!item.properties) return undefined
  const prop = item.properties.find((p) => p.name === key)
  return prop?.value
}

function extractBundleGroups(lineItems: OrderLineItem[]): BundleLineGroup[] {
  const groups = new Map<string, BundleLineGroup>()

  for (const item of lineItems) {
    const bundleId = getLineProperty(item, '_bundle_id')
    if (!bundleId) continue

    if (!groups.has(bundleId)) {
      groups.set(bundleId, {
        bundleId,
        bundleTier: getLineProperty(item, '_bundle_tier') ?? '',
        bundleDiscount: getLineProperty(item, '_bundle_discount') ?? '0',
        bundleDiscountType: getLineProperty(item, '_bundle_discount_type') ?? 'percentage',
        bundleSize: parseInt(getLineProperty(item, '_bundle_size') ?? '0', 10),
        items: [],
        subtotalCents: 0,
        discountCents: 0,
      })
    }

    const group = groups.get(bundleId)!
    const isFreeGift = getLineProperty(item, '_bundle_free_gift') === 'true'

    if (!isFreeGift) {
      group.items.push(item)
      const itemCents = Math.round(parseFloat(item.price) * 100) * item.quantity
      group.subtotalCents += itemCents
    }
  }

  // Calculate discount cents per group
  for (const group of groups.values()) {
    const discountValue = parseFloat(group.bundleDiscount)
    if (group.bundleDiscountType === 'percentage') {
      group.discountCents = Math.round(group.subtotalCents * (discountValue / 100))
    } else {
      group.discountCents = Math.round(discountValue * 100)
    }
  }

  return Array.from(groups.values())
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request)

  logger.info(`[BundleWebhook] Received ${topic} for ${shop}`)

  const order = payload as unknown as OrderWebhookPayload

  if (!order?.line_items?.length) {
    return new Response()
  }

  const bundleGroups = extractBundleGroups(order.line_items)

  if (bundleGroups.length === 0) {
    return new Response()
  }

  logger.info(
    `[BundleWebhook] Order #${order.order_number}: found ${bundleGroups.length} bundle(s)`
  )

  // Resolve tenant from shop domain (multi-tenant support)
  const { getOrganizationIdForShop } = await import('@cgk-platform/shopify')
  const { sql } = await import('@cgk-platform/db')

  const organizationId = await getOrganizationIdForShop(shop)

  if (!organizationId) {
    logger.warn(`[BundleWebhook] Shop ${shop} not registered with any tenant — skipping`)
    return new Response()
  }

  // Get tenant slug from organization
  const orgResult = await sql`
    SELECT slug FROM public.organizations WHERE id = ${organizationId} LIMIT 1
  `

  const tenantSlug = orgResult.rows[0]?.slug as string | undefined

  if (!tenantSlug) {
    logger.warn(`[BundleWebhook] Organization ${organizationId} not found — skipping`)
    return new Response()
  }

  // Post bundle order data to CGK platform admin API
  const platformApiUrl = process.env.CGK_PLATFORM_API_URL
  const platformApiKey = process.env.CGK_PLATFORM_API_KEY

  if (!platformApiUrl || !platformApiKey) {
    logger.warn(
      '[BundleWebhook] Missing CGK_PLATFORM_API_URL or CGK_PLATFORM_API_KEY — skipping platform sync'
    )
    return new Response()
  }

  for (const group of bundleGroups) {
    const totalCents = group.subtotalCents - group.discountCents

    try {
      const resp = await fetch(`${platformApiUrl}/api/admin/bundles/${group.bundleId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          Authorization: `Bearer ${platformApiKey}`,
        },
        body: JSON.stringify({
          order_id: String(order.id),
          customer_id: order.customer?.id ? String(order.customer.id) : null,
          items_count: group.items.length,
          subtotal_cents: group.subtotalCents,
          discount_cents: group.discountCents,
          total_cents: totalCents,
          tier_label: group.bundleTier || null,
        }),
      })

      if (!resp.ok) {
        logger.error(
          `[BundleWebhook] Failed to sync bundle order for ${group.bundleId}: ${resp.status} ${resp.statusText}`
        )
      }
    } catch (err) {
      logger.error(
        `[BundleWebhook] Error syncing bundle order for ${group.bundleId}:`,
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }

  return new Response()
}
