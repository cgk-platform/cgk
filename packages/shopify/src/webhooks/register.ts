/**
 * Webhook Registration
 *
 * Functions for registering and managing webhook subscriptions with Shopify
 */

import { withTenant, sql } from '@cgk/db'
import { createAdminClient } from '../admin'
import type { WebhookTopic, WebhookSyncResult, ShopifyCredentials } from './types'

/**
 * Required webhook topics that are auto-registered on app installation
 */
export const REQUIRED_TOPICS: WebhookTopic[] = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  'refunds/create',
  'fulfillments/create',
  'fulfillments/update',
  'customers/create',
  'customers/update',
  'app/uninstalled',
]

/**
 * Optional webhook topics that can be enabled per-tenant
 */
export const OPTIONAL_TOPICS: Record<string, WebhookTopic[]> = {
  'commerce.product_sync': ['products/create', 'products/update'],
  'commerce.inventory_sync': ['inventory_levels/update'],
  'commerce.abandoned_cart': ['checkouts/create', 'checkouts/update'],
  'commerce.draft_orders': ['draft_orders/create'],
  'subscriptions.enabled': ['subscription_contracts/create', 'subscription_contracts/update'],
}

/**
 * GraphQL mutation to create a webhook subscription
 */
const CREATE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

/**
 * GraphQL query to list existing webhook subscriptions
 */
const LIST_WEBHOOKS_QUERY = `
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`

/**
 * GraphQL mutation to delete a webhook subscription
 */
const DELETE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`

/**
 * Convert topic string to Shopify enum format
 * e.g., "orders/create" -> "ORDERS_CREATE"
 */
function topicToEnum(topic: string): string {
  return topic.replace('/', '_').toUpperCase()
}

/**
 * Register all required webhooks for a shop on app installation
 *
 * @param tenantId - The tenant ID
 * @param shop - The shop domain
 * @param accessToken - The Shopify access token
 * @param webhookUrl - The URL to receive webhooks
 */
export async function registerWebhooks(
  tenantId: string,
  shop: string,
  accessToken: string,
  webhookUrl: string
): Promise<void> {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken,
  })

  const errors: Array<{ topic: string; error: string }> = []

  for (const topic of REQUIRED_TOPICS) {
    try {
      const result = await client.query<{
        webhookSubscriptionCreate: {
          webhookSubscription: { id: string; topic: string } | null
          userErrors: Array<{ field: string; message: string }>
        }
      }>(CREATE_WEBHOOK_MUTATION, {
        topic: topicToEnum(topic),
        webhookSubscription: {
          callbackUrl: webhookUrl,
          format: 'JSON',
        },
      })

      const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate

      if (userErrors && userErrors.length > 0) {
        const firstError = userErrors[0]
        const error = firstError ? firstError.message : 'Unknown error'
        console.error(`[Webhook] Failed to register ${topic} for ${shop}: ${error}`)
        errors.push({ topic, error })
        continue
      }

      if (webhookSubscription) {
        // Store the registration
        await withTenant(tenantId, async () => {
          await sql`
            INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
            VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
            ON CONFLICT (shop, topic) DO UPDATE SET
              shopify_webhook_id = EXCLUDED.shopify_webhook_id,
              address = EXCLUDED.address,
              status = 'active',
              failure_count = 0,
              updated_at = NOW()
          `
        })

        console.log(`[Webhook] Registered ${topic} for ${shop}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Webhook] Failed to register ${topic} for ${shop}:`, error)
      errors.push({ topic, error: message })
    }
  }

  if (errors.length > 0) {
    console.error(`[Webhook] ${errors.length} webhooks failed to register for ${shop}`)
  }
}

/**
 * Register a single webhook
 */
export async function registerSingleWebhook(
  tenantId: string,
  shop: string,
  accessToken: string,
  topic: WebhookTopic,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken,
  })

  try {
    const result = await client.query<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string; topic: string } | null
        userErrors: Array<{ field: string; message: string }>
      }
    }>(CREATE_WEBHOOK_MUTATION, {
      topic: topicToEnum(topic),
      webhookSubscription: {
        callbackUrl: webhookUrl,
        format: 'JSON',
      },
    })

    const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate

    if (userErrors && userErrors.length > 0) {
      const firstError = userErrors[0]
      return { success: false, error: firstError ? firstError.message : 'Unknown error' }
    }

    if (webhookSubscription) {
      await withTenant(tenantId, async () => {
        await sql`
          INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
          VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
          ON CONFLICT (shop, topic) DO UPDATE SET
            shopify_webhook_id = EXCLUDED.shopify_webhook_id,
            address = EXCLUDED.address,
            status = 'active',
            failure_count = 0,
            updated_at = NOW()
        `
      })

      return { success: true }
    }

    return { success: false, error: 'No webhook subscription returned' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Sync webhook registrations with Shopify
 *
 * Checks which webhooks are registered in Shopify and reconciles with our database.
 * Re-registers any missing webhooks.
 */
export async function syncWebhookRegistrations(
  tenantId: string,
  shop: string,
  credentials: ShopifyCredentials,
  webhookUrl: string
): Promise<WebhookSyncResult> {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: credentials.accessToken,
  })

  const result: WebhookSyncResult = {
    added: [],
    removed: [],
    unchanged: [],
    errors: [],
  }

  try {
    // Get current registrations from Shopify
    const shopifyResponse = await client.query<{
      webhookSubscriptions: {
        edges: Array<{
          node: {
            id: string
            topic: string
            endpoint: { callbackUrl?: string }
          }
        }>
      }
    }>(LIST_WEBHOOKS_QUERY)

    const shopifyWebhooks = shopifyResponse.webhookSubscriptions.edges.map(e => ({
      id: e.node.id,
      topic: e.node.topic.toLowerCase().replace('_', '/'),
      url: e.node.endpoint.callbackUrl,
    }))

    // Get our tracked registrations
    const ourRegistrations = await withTenant(tenantId, async () => {
      const res = await sql`
        SELECT topic, shopify_webhook_id, status
        FROM webhook_registrations
        WHERE shop = ${shop}
      `
      return res.rows as Array<{ topic: string; shopify_webhook_id: string; status: string }>
    })

    // Check for missing webhooks
    for (const topic of REQUIRED_TOPICS) {
      const existsInShopify = shopifyWebhooks.some(
        w => w.topic === topic && w.url === webhookUrl
      )

      if (!existsInShopify) {
        // Re-register the missing webhook
        const registerResult = await registerSingleWebhook(
          tenantId,
          shop,
          credentials.accessToken,
          topic,
          webhookUrl
        )

        if (registerResult.success) {
          result.added.push(topic)
        } else {
          result.errors.push({ topic, error: registerResult.error || 'Failed to register' })
        }
      } else {
        result.unchanged.push(topic)
      }
    }

    // Clean up orphaned registrations in our database
    for (const reg of ourRegistrations) {
      const existsInShopify = shopifyWebhooks.some(
        w => w.id === reg.shopify_webhook_id
      )

      if (!existsInShopify && reg.status !== 'deleted') {
        await withTenant(tenantId, async () => {
          await sql`
            UPDATE webhook_registrations
            SET status = 'deleted', updated_at = NOW()
            WHERE shop = ${shop} AND topic = ${reg.topic}
          `
        })
        result.removed.push(reg.topic)
      }
    }

    return result
  } catch (error) {
    console.error(`[Webhook] Sync failed for ${shop}:`, error)
    throw error
  }
}

/**
 * Unregister a webhook from Shopify
 */
export async function unregisterWebhook(
  tenantId: string,
  shop: string,
  accessToken: string,
  topic: WebhookTopic
): Promise<void> {
  // Get the webhook ID from our database
  const registration = await withTenant(tenantId, async () => {
    const res = await sql`
      SELECT shopify_webhook_id
      FROM webhook_registrations
      WHERE shop = ${shop} AND topic = ${topic}
    `
    return res.rows[0] as { shopify_webhook_id: string } | undefined
  })

  if (!registration?.shopify_webhook_id) {
    console.log(`[Webhook] No registration found for ${topic} on ${shop}`)
    return
  }

  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken,
  })

  try {
    await client.query(DELETE_WEBHOOK_MUTATION, {
      id: registration.shopify_webhook_id,
    })

    // Mark as deleted in our database
    await withTenant(tenantId, async () => {
      await sql`
        UPDATE webhook_registrations
        SET status = 'deleted', updated_at = NOW()
        WHERE shop = ${shop} AND topic = ${topic}
      `
    })

    console.log(`[Webhook] Unregistered ${topic} for ${shop}`)
  } catch (error) {
    console.error(`[Webhook] Failed to unregister ${topic} for ${shop}:`, error)
    throw error
  }
}
