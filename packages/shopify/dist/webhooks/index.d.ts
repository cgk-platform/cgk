/**
 * Main Shopify Webhook Handler
 *
 * Entry point for all incoming Shopify webhooks
 */
/**
 * Handle an incoming Shopify webhook request
 *
 * This is the main entry point for all Shopify webhooks.
 * It performs the following:
 * 1. Validates required headers
 * 2. Routes shop domain to tenant
 * 3. Verifies HMAC signature
 * 4. Checks for duplicates (idempotency)
 * 5. Logs the event
 * 6. Routes to the appropriate handler
 *
 * @param request - The incoming webhook request
 * @returns Response to send back to Shopify
 */
declare function handleShopifyWebhook(request: Request): Promise<Response>;
/**
 * Create a webhook handler for Next.js API routes
 *
 * @example
 * ```ts
 * // app/api/webhooks/shopify/route.ts
 * import { createWebhookRoute } from '@cgk-platform/shopify/webhooks'
 *
 * export const POST = createWebhookRoute()
 * ```
 */
declare function createWebhookRoute(): (request: Request) => Promise<Response>;

/**
 * Shopify Webhook Types
 */
/**
 * All supported webhook topics
 */
type WebhookTopic = 'orders/create' | 'orders/updated' | 'orders/paid' | 'orders/cancelled' | 'orders/fulfilled' | 'refunds/create' | 'fulfillments/create' | 'fulfillments/update' | 'customers/create' | 'customers/update' | 'customers/delete' | 'customers/redact' | 'customers/data_request' | 'shop/redact' | 'app/uninstalled' | 'products/create' | 'products/update' | 'products/delete' | 'inventory_levels/update' | 'checkouts/create' | 'checkouts/update' | 'draft_orders/create' | 'subscription_contracts/create' | 'subscription_contracts/update';
/**
 * Webhook event status
 */
type WebhookEventStatus = 'pending' | 'processing' | 'completed' | 'failed';
/**
 * Webhook registration status
 */
type WebhookRegistrationStatus = 'active' | 'failed' | 'deleted';
/**
 * Stored webhook event
 */
interface WebhookEvent {
    id: string;
    shop: string;
    topic: WebhookTopic;
    shopifyWebhookId: string | null;
    payload: unknown;
    hmacVerified: boolean;
    status: WebhookEventStatus;
    processedAt: Date | null;
    errorMessage: string | null;
    retryCount: number;
    idempotencyKey: string | null;
    receivedAt: Date;
    headers: Record<string, string> | null;
}
/**
 * Webhook registration record
 */
interface WebhookRegistration {
    id: string;
    shop: string;
    topic: WebhookTopic;
    shopifyWebhookId: string | null;
    address: string;
    format: string;
    status: WebhookRegistrationStatus;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    failureCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Shopify connection record
 */
interface ShopifyConnection {
    id: string;
    shop: string;
    accessToken: string;
    webhookSecret: string | null;
    scope: string[];
    status: 'active' | 'uninstalled' | 'suspended';
    installedAt: Date;
    uninstalledAt: Date | null;
    storeName: string | null;
    storeEmail: string | null;
    storeDomain: string | null;
    storeCurrency: string;
    storeTimezone: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Shopify credentials for API calls
 */
interface ShopifyCredentials {
    shop: string;
    accessToken: string;
    webhookSecret: string | null;
}
/**
 * Webhook handler function type
 */
type WebhookHandler = (tenantId: string, payload: unknown, eventId: string) => Promise<void>;
/**
 * Webhook sync result
 */
interface WebhookSyncResult {
    added: string[];
    removed: string[];
    unchanged: string[];
    errors: Array<{
        topic: string;
        error: string;
    }>;
}
/**
 * Webhook health status
 */
interface WebhookHealthStatus {
    shop: string;
    registrations: Array<{
        topic: WebhookTopic;
        status: WebhookRegistrationStatus;
        lastSuccessAt: Date | null;
        failureCount: number;
    }>;
    recentEvents: {
        total: number;
        completed: number;
        failed: number;
        pending: number;
    };
}
/**
 * Order webhook payload from Shopify
 */
interface ShopifyOrderPayload {
    id: number;
    admin_graphql_api_id: string;
    name: string;
    email: string | null;
    created_at: string;
    updated_at: string;
    cancelled_at: string | null;
    closed_at: string | null;
    currency: string;
    total_price: string;
    subtotal_price: string;
    total_tax: string;
    total_discounts: string;
    total_shipping_price_set?: {
        shop_money: {
            amount: string;
            currency_code: string;
        };
    };
    financial_status: string;
    fulfillment_status: string | null;
    customer?: {
        id: number;
        email: string | null;
        phone: string | null;
        first_name: string | null;
        last_name: string | null;
    };
    line_items: Array<{
        id: number;
        product_id: number | null;
        variant_id: number | null;
        title: string;
        quantity: number;
        price: string;
        sku: string | null;
        variant_title: string | null;
    }>;
    discount_codes?: Array<{
        code: string;
        amount: string;
        type: string;
    }>;
    note_attributes?: Array<{
        name: string;
        value: string;
    }>;
    shipping_address?: ShopifyAddressPayload;
    billing_address?: ShopifyAddressPayload;
    shipping_lines?: Array<{
        id: number;
        title: string;
        price: string;
        code: string | null;
    }>;
    tags: string;
}
/**
 * Address payload from Shopify
 */
interface ShopifyAddressPayload {
    first_name: string | null;
    last_name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    province_code: string | null;
    country: string | null;
    country_code: string | null;
    zip: string | null;
    phone: string | null;
}
/**
 * Customer webhook payload from Shopify
 */
interface ShopifyCustomerPayload {
    id: number;
    admin_graphql_api_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
    orders_count: number;
    total_spent: string;
    tags: string;
    default_address?: ShopifyAddressPayload;
    addresses?: ShopifyAddressPayload[];
}
/**
 * Fulfillment webhook payload from Shopify
 */
interface ShopifyFulfillmentPayload {
    id: number;
    admin_graphql_api_id: string;
    order_id: number;
    status: string;
    created_at: string;
    updated_at: string;
    tracking_company: string | null;
    tracking_number: string | null;
    tracking_numbers: string[];
    tracking_url: string | null;
    tracking_urls: string[];
    line_items: Array<{
        id: number;
        product_id: number | null;
        variant_id: number | null;
        title: string;
        quantity: number;
    }>;
}
/**
 * Refund webhook payload from Shopify
 */
interface ShopifyRefundPayload {
    id: number;
    admin_graphql_api_id: string;
    order_id: number;
    created_at: string;
    processed_at: string | null;
    note: string | null;
    restock: boolean;
    refund_line_items: Array<{
        id: number;
        line_item_id: number;
        quantity: number;
        subtotal: string;
        total_tax: string;
    }>;
    transactions: Array<{
        id: number;
        amount: string;
        kind: string;
        status: string;
    }>;
}

/**
 * Shopify Webhook Router
 *
 * Routes webhook events to topic-specific handlers
 */

/**
 * Route a webhook event to its handler
 *
 * @param tenantId - The tenant ID for this webhook
 * @param topic - The webhook topic
 * @param payload - The webhook payload
 * @param eventId - The stored event ID
 */
declare function routeToHandler(tenantId: string, topic: string, payload: unknown, eventId: string): Promise<void>;
/**
 * Check if a topic has a registered handler
 */
declare function hasHandler(topic: string): boolean;
/**
 * Get all registered webhook topics
 */
declare function getRegisteredTopics(): WebhookTopic[];
/**
 * Register a custom webhook handler
 *
 * This allows extending the webhook system with custom handlers
 */
declare function registerHandler(topic: WebhookTopic, handler: WebhookHandler): void;

/**
 * Webhook Registration
 *
 * Functions for registering and managing webhook subscriptions with Shopify
 */

/**
 * Required webhook topics that are auto-registered on app installation
 */
declare const REQUIRED_TOPICS: WebhookTopic[];
/**
 * Optional webhook topics that can be enabled per-tenant
 */
declare const OPTIONAL_TOPICS: Record<string, WebhookTopic[]>;
/**
 * Register all required webhooks for a shop on app installation
 *
 * @param tenantId - The tenant ID
 * @param shop - The shop domain
 * @param accessToken - The Shopify access token
 * @param webhookUrl - The URL to receive webhooks
 */
declare function registerWebhooks(tenantId: string, shop: string, accessToken: string, webhookUrl: string): Promise<void>;
/**
 * Register a single webhook
 */
declare function registerSingleWebhook(tenantId: string, shop: string, accessToken: string, topic: WebhookTopic, webhookUrl: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Sync webhook registrations with Shopify
 *
 * Checks which webhooks are registered in Shopify and reconciles with our database.
 * Re-registers any missing webhooks.
 */
declare function syncWebhookRegistrations(tenantId: string, shop: string, credentials: ShopifyCredentials, webhookUrl: string): Promise<WebhookSyncResult>;
/**
 * Unregister a webhook from Shopify
 */
declare function unregisterWebhook(tenantId: string, shop: string, accessToken: string, topic: WebhookTopic): Promise<void>;

/**
 * Webhook Health Monitoring
 *
 * Functions to check webhook health and retrieve event statistics
 */

/**
 * Get webhook health status for a shop
 *
 * Returns registration status and recent event statistics
 */
declare function getWebhookHealth(tenantId: string, shop: string): Promise<WebhookHealthStatus>;
/**
 * Get recent webhook events for a shop
 */
declare function getRecentWebhookEvents(tenantId: string, shop: string, options?: {
    limit?: number;
    offset?: number;
    status?: WebhookEventStatus;
    topic?: string;
}): Promise<{
    events: WebhookEvent[];
    total: number;
}>;
/**
 * Get failed webhook events that need retry
 */
declare function getFailedWebhooksForRetry(tenantId: string, options?: {
    maxRetries?: number;
    hoursAgo?: number;
    limit?: number;
}): Promise<WebhookEvent[]>;
/**
 * Update webhook registration success timestamp
 */
declare function recordWebhookSuccess(tenantId: string, shop: string, topic: string): Promise<void>;
/**
 * Record a webhook registration failure
 */
declare function recordWebhookFailure(tenantId: string, shop: string, topic: string): Promise<void>;
/**
 * Get webhook event counts by topic for the last N days
 */
declare function getWebhookEventsByTopic(tenantId: string, shop: string, days?: number): Promise<Array<{
    topic: string;
    count: number;
    failedCount: number;
}>>;

/**
 * Shopify Webhook Utilities
 */

/**
 * Verify a Shopify webhook HMAC signature
 *
 * @param body - Raw request body as string
 * @param signature - HMAC signature from x-shopify-hmac-sha256 header
 * @param secret - Webhook secret from Shopify app settings
 * @returns True if signature is valid
 */
declare function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean;
/**
 * Get tenant ID for a Shopify shop domain
 *
 * Queries shopify_connections first (written by OAuth callback),
 * then falls back to organizations table for legacy/manual setups.
 */
declare function getTenantForShop(shop: string): Promise<string | null>;
/**
 * Get Shopify credentials for a tenant
 */
declare function getShopifyCredentials(_tenantId: string, shop: string): Promise<ShopifyCredentials | null>;
/**
 * Check for duplicate webhook by idempotency key
 */
declare function checkDuplicateWebhook(idempotencyKey: string): Promise<boolean>;
/**
 * Log a webhook event to the database
 */
declare function logWebhookEvent(params: {
    shop: string;
    topic: string;
    shopifyWebhookId: string | null;
    payload: unknown;
    hmacVerified: boolean;
    idempotencyKey: string;
    headers: Record<string, string>;
}): Promise<string>;
/**
 * Update webhook event status
 */
declare function updateWebhookStatus(eventId: string, status: WebhookEventStatus, errorMessage?: string): Promise<void>;
/**
 * Get webhook event by ID
 */
declare function getWebhookEvent(eventId: string): Promise<WebhookEvent | null>;
/**
 * Parse price string to cents
 */
declare function parseCents(priceString: string | number | undefined | null): number;
/**
 * Map Shopify financial status to internal status
 */
declare function mapFinancialStatus(status: string | null | undefined): string;
/**
 * Map Shopify fulfillment status to internal status
 */
declare function mapFulfillmentStatus(status: string | null | undefined): string;
/**
 * Extract resource ID from webhook payload for idempotency
 */
declare function extractResourceId(payload: unknown): string | null;
/**
 * Generate idempotency key for webhook
 */
declare function generateIdempotencyKey(topic: string, resourceId: string | null, webhookId: string | null): string;
/**
 * Convert headers iterator to object
 */
declare function headersToObject(headers: Headers): Record<string, string>;

/**
 * Order Webhook Handlers
 *
 * Handles orders/create, orders/updated, orders/paid, orders/cancelled, orders/fulfilled
 */
/**
 * Handle orders/create webhook
 *
 * Creates or updates the order in the local database and triggers
 * background jobs for attribution, commission calculation, and A/B test attribution
 */
declare function handleOrderCreate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;
/**
 * Handle orders/paid webhook
 *
 * Updates the order status and triggers paid-specific actions like
 * gift card rewards and pixel events
 */
declare function handleOrderPaid(tenantId: string, payload: unknown, eventId: string): Promise<void>;
/**
 * Handle orders/updated webhook
 *
 * Updates the order status in the local database
 */
declare function handleOrderUpdate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;
/**
 * Handle orders/cancelled webhook
 *
 * Updates the order as cancelled and triggers exclusion from A/B tests
 * and commission reversal
 */
declare function handleOrderCancelled(tenantId: string, payload: unknown, eventId: string): Promise<void>;

/**
 * Fulfillment Webhook Handlers
 *
 * Handles fulfillments/create and fulfillments/update webhooks
 */
/**
 * Handle fulfillments/create webhook
 *
 * Creates a fulfillment record and triggers review email queue
 */
declare function handleFulfillmentCreate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;
/**
 * Handle fulfillments/update webhook
 *
 * Updates tracking information and triggers notifications if tracking changed
 */
declare function handleFulfillmentUpdate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;

/**
 * Refund Webhook Handler
 *
 * Handles refunds/create webhook
 */
/**
 * Handle refunds/create webhook
 *
 * Creates a refund record and triggers commission adjustment and pixel events
 */
declare function handleRefundCreate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;

/**
 * Customer Webhook Handlers
 *
 * Handles customers/create and customers/update webhooks
 */
/**
 * Handle customers/create webhook
 *
 * Creates a customer record in the local database
 */
declare function handleCustomerCreate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;
/**
 * Handle customers/update webhook
 *
 * Updates customer record in the local database
 */
declare function handleCustomerUpdate(tenantId: string, payload: unknown, _eventId: string): Promise<void>;

/**
 * App Webhook Handler
 *
 * Handles app/uninstalled webhook
 */
/**
 * Handle app/uninstalled webhook
 *
 * Marks the Shopify connection as disconnected and clears tokens
 */
declare function handleAppUninstalled(tenantId: string, payload: unknown, _eventId: string): Promise<void>;

export { OPTIONAL_TOPICS, REQUIRED_TOPICS, type ShopifyAddressPayload, type ShopifyConnection, type ShopifyCredentials, type ShopifyCustomerPayload, type ShopifyFulfillmentPayload, type ShopifyOrderPayload, type ShopifyRefundPayload, type WebhookEvent, type WebhookEventStatus, type WebhookHandler, type WebhookHealthStatus, type WebhookRegistration, type WebhookRegistrationStatus, type WebhookSyncResult, type WebhookTopic, checkDuplicateWebhook, createWebhookRoute, extractResourceId, generateIdempotencyKey, getFailedWebhooksForRetry, getRecentWebhookEvents, getRegisteredTopics, getShopifyCredentials, getTenantForShop, getWebhookEvent, getWebhookEventsByTopic, getWebhookHealth, handleAppUninstalled, handleCustomerCreate, handleCustomerUpdate, handleFulfillmentCreate, handleFulfillmentUpdate, handleOrderCancelled, handleOrderCreate, handleOrderPaid, handleOrderUpdate, handleRefundCreate, handleShopifyWebhook, hasHandler, headersToObject, logWebhookEvent, mapFinancialStatus, mapFulfillmentStatus, parseCents, recordWebhookFailure, recordWebhookSuccess, registerHandler, registerSingleWebhook, registerWebhooks, routeToHandler, syncWebhookRegistrations, unregisterWebhook, updateWebhookStatus, verifyShopifyWebhook };
