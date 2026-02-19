/**
 * Product Webhook Handlers
 *
 * Handles products/create, products/update, products/delete webhooks.
 * Product deletes archive the local record; creates and updates trigger
 * a background sync job to pull the full product from Shopify.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'

interface ShopifyProductPayload {
  id: number
  title: string
  handle: string | null
  status: string
  vendor: string | null
  product_type: string | null
  tags: string
  admin_graphql_api_id: string
}

/**
 * Handle products/create webhook
 *
 * Triggers a background job to pull and sync the full product data.
 */
export async function handleProductCreate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const product = payload as ShopifyProductPayload
  const shopifyProductId = product.id.toString()

  await tasks.trigger('commerce-product-sync', {
    tenantId,
    shopifyProductId,
    action: 'create',
  })

  console.log(`[Webhook] Product ${shopifyProductId} created for tenant ${tenantId}`)
}

/**
 * Handle products/update webhook
 *
 * Triggers a background job to pull and sync the updated product data.
 */
export async function handleProductUpdate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const product = payload as ShopifyProductPayload
  const shopifyProductId = product.id.toString()

  await tasks.trigger('commerce-product-sync', {
    tenantId,
    shopifyProductId,
    action: 'update',
  })

  console.log(`[Webhook] Product ${shopifyProductId} updated for tenant ${tenantId}`)
}

/**
 * Handle products/delete webhook
 *
 * Archives the local product record when Shopify deletes the product.
 */
export async function handleProductDelete(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const product = payload as ShopifyProductPayload
  const shopifyProductId = product.id.toString()

  await withTenant(tenantId, async () => {
    await sql`
      UPDATE products
      SET
        status = 'archived',
        updated_at = NOW()
      WHERE shopify_product_id = ${shopifyProductId}
    `
  })

  console.log(`[Webhook] Product ${shopifyProductId} deleted/archived for tenant ${tenantId}`)
}
