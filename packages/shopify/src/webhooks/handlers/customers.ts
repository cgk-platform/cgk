/**
 * Customer Webhook Handlers
 *
 * Handles customers/create and customers/update webhooks
 */

import { withTenant, sql } from '@cgk-platform/db'
import { tasks } from '@trigger.dev/sdk/v3'
import type { ShopifyCustomerPayload } from '../types'

/**
 * Handle customers/create webhook
 *
 * Creates a customer record in the local database
 */
export async function handleCustomerCreate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const customer = payload as ShopifyCustomerPayload
  const shopifyCustomerId = customer.id.toString()

  await withTenant(tenantId, async () => {
    await upsertCustomer(customer)

    // Sync customer addresses
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses)
    }
  })

  // Trigger background job for customer sync
  await tasks.trigger('commerce-customer-sync', {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false,
  })

  console.log(`[Webhook] Customer ${shopifyCustomerId} created for tenant ${tenantId}`)
}

/**
 * Handle customers/update webhook
 *
 * Updates customer record in the local database
 */
export async function handleCustomerUpdate(
  tenantId: string,
  payload: unknown,
  _eventId: string
): Promise<void> {
  const customer = payload as ShopifyCustomerPayload
  const shopifyCustomerId = customer.id.toString()

  await withTenant(tenantId, async () => {
    await upsertCustomer(customer)

    // Sync customer addresses
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses)
    }
  })

  // Trigger background job for customer sync
  await tasks.trigger('commerce-customer-sync', {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false,
  })

  console.log(`[Webhook] Customer ${shopifyCustomerId} updated for tenant ${tenantId}`)
}

/**
 * Upsert customer to database
 */
async function upsertCustomer(customer: ShopifyCustomerPayload): Promise<void> {
  const shopifyCustomerId = customer.id.toString()
  const tags = customer.tags
    ? customer.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  await sql`
    INSERT INTO customers (
      shopify_id,
      email,
      first_name,
      last_name,
      phone,
      orders_count,
      total_spent_cents,
      tags,
      shopify_created_at,
      synced_at
    ) VALUES (
      ${shopifyCustomerId},
      ${customer.email || null},
      ${customer.first_name || null},
      ${customer.last_name || null},
      ${customer.phone || null},
      ${customer.orders_count},
      ${Math.round(parseFloat(customer.total_spent || '0') * 100)},
      ${JSON.stringify(tags)},
      ${customer.created_at},
      NOW()
    )
    ON CONFLICT (shopify_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      orders_count = EXCLUDED.orders_count,
      total_spent_cents = EXCLUDED.total_spent_cents,
      tags = EXCLUDED.tags,
      synced_at = NOW()
  `

  // Update default address if present
  if (customer.default_address) {
    await sql`
      UPDATE customers
      SET
        default_address_line1 = ${customer.default_address.address1 || null},
        default_address_line2 = ${customer.default_address.address2 || null},
        default_address_city = ${customer.default_address.city || null},
        default_address_province = ${customer.default_address.province || null},
        default_address_province_code = ${customer.default_address.province_code || null},
        default_address_country = ${customer.default_address.country || null},
        default_address_country_code = ${customer.default_address.country_code || null},
        default_address_zip = ${customer.default_address.zip || null}
      WHERE shopify_id = ${shopifyCustomerId}
    `
  }
}

/**
 * Sync customer addresses to database
 */
async function syncCustomerAddresses(
  customerId: string,
  addresses: ShopifyCustomerPayload['addresses']
): Promise<void> {
  if (!addresses || addresses.length === 0) {
    return
  }

  // Delete existing addresses
  await sql`DELETE FROM customer_addresses WHERE customer_shopify_id = ${customerId}`

  // Insert new addresses
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    if (!address) continue

    await sql`
      INSERT INTO customer_addresses (
        customer_shopify_id,
        address_index,
        first_name,
        last_name,
        address1,
        address2,
        city,
        province,
        province_code,
        country,
        country_code,
        zip,
        phone
      ) VALUES (
        ${customerId},
        ${i},
        ${address.first_name || null},
        ${address.last_name || null},
        ${address.address1 || null},
        ${address.address2 || null},
        ${address.city || null},
        ${address.province || null},
        ${address.province_code || null},
        ${address.country || null},
        ${address.country_code || null},
        ${address.zip || null},
        ${address.phone || null}
      )
    `
  }
}
