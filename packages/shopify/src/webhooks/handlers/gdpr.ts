/**
 * Shopify GDPR Webhook Handlers
 *
 * Legally required handlers for Shopify app approval.
 * These are registered via the Partner Dashboard, not the REST webhook API.
 *
 * Required topics:
 *   customers/redact       — Delete/anonymize customer PII
 *   shop/redact            — Delete all shop data after uninstall (48h later)
 *   customers/data_request — Provide all data held for a customer
 *   customers/delete       — Customer deleted their own account
 */

import { withTenant, sql } from '@cgk-platform/db'

interface CustomerRedactPayload {
  shop_id: number
  shop_domain: string
  customer: { id: number; email: string; phone?: string }
  orders_to_redact: number[]
}

interface ShopRedactPayload {
  shop_id: number
  shop_domain: string
}

interface CustomerDataRequestPayload {
  shop_id: number
  shop_domain: string
  customer: { id: number; email: string; phone?: string }
  orders_requested: number[]
}

/**
 * Handle customers/redact webhook
 *
 * Anonymizes customer PII when a customer requests erasure.
 * Called by Shopify as part of GDPR compliance.
 */
export async function handleCustomerRedact(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const data = payload as CustomerRedactPayload
  const customerId = String(data.customer.id)

  await withTenant(tenantId, async () => {
    // Anonymize customer PII
    await sql`
      UPDATE customers
      SET
        email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
        first_name = 'Redacted',
        last_name = 'Customer',
        phone = NULL,
        default_address_line1 = NULL,
        default_address_line2 = NULL,
        default_address_city = NULL,
        default_address_province = NULL,
        default_address_zip = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `

    // Anonymize email on orders flagged for redaction
    if (data.orders_to_redact.length > 0) {
      const orderIds = `{${data.orders_to_redact.join(',')}}`
      await sql`
        UPDATE orders
        SET
          customer_email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
          updated_at = NOW()
        WHERE customer_id = ${customerId}
          AND shopify_id = ANY(${orderIds}::text[])
      `
    }

    // Remove all stored addresses
    await sql`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `
  })

  console.log(`[GDPR] Customer ${customerId} PII redacted for tenant ${tenantId} (shop: ${data.shop_domain})`)
}

/**
 * Handle shop/redact webhook
 *
 * Clear all Shopify credentials and mark connection as deleted.
 * Called by Shopify 48 hours after app/uninstalled.
 */
export async function handleShopRedact(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const data = payload as ShopRedactPayload

  // Clear all encrypted credentials for the shop
  await sql`
    UPDATE shopify_connections
    SET
      status = 'deleted',
      access_token_encrypted = NULL,
      webhook_secret_encrypted = NULL,
      storefront_api_token_encrypted = NULL,
      updated_at = NOW()
    WHERE shop = ${data.shop_domain}
  `

  console.log(`[GDPR] Shop ${data.shop_domain} credentials cleared for tenant ${tenantId}`)
}

/**
 * Handle customers/data_request webhook
 *
 * Logs the data request. In a production implementation this would
 * trigger a background job to compile and email the customer's data
 * to the shop owner for forwarding to the customer.
 */
export async function handleCustomerDataRequest(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const data = payload as CustomerDataRequestPayload
  const customerId = String(data.customer.id)

  // Log the data request to the webhook events table for audit trail
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO webhook_events (
        shop,
        topic,
        shopify_webhook_id,
        payload,
        hmac_verified,
        idempotency_key,
        headers,
        status
      ) VALUES (
        ${data.shop_domain},
        'customers/data_request',
        NULL,
        ${JSON.stringify(data)},
        TRUE,
        ${`gdpr-data-request:${customerId}:${data.shop_domain}`},
        '{}',
        'completed'
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `
  })

  console.log(`[GDPR] Data request logged for customer ${customerId} at shop ${data.shop_domain}, tenant ${tenantId}`)
}

/**
 * Handle customers/delete webhook
 *
 * Anonymizes customer data when a customer deletes their Shopify account.
 * Preserves order history for accounting but removes PII.
 */
export async function handleCustomerDelete(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const customer = payload as { id: number; email?: string }
  const customerId = String(customer.id)

  await withTenant(tenantId, async () => {
    // Anonymize rather than hard-delete to preserve order history
    await sql`
      UPDATE customers
      SET
        email = CONCAT('deleted-', shopify_id, '@deleted.invalid'),
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `

    // Remove stored addresses
    await sql`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `
  })

  console.log(`[Webhook] Customer ${customerId} deleted for tenant ${tenantId}`)
}
