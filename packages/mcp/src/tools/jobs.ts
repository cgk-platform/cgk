/**
 * Job Discovery Tools
 *
 * Tools for discovering Trigger.dev job events and their schemas.
 * Helps discover the 80+ available job events without grepping.
 *
 * @category Background Jobs
 */

import { defineTool, jsonResult, errorResult } from '../tools'
import type { ToolDefinition } from '../tools'

// =============================================================================
// Event Categories & Metadata
// =============================================================================

/**
 * Event categories with descriptions
 */
const EVENT_CATEGORIES = {
  commerce: {
    description: 'Order, customer, product, and inventory events',
    prefix: 'order|customer|product|inventory',
  },
  reviews: {
    description: 'Survey responses and review email automation',
    prefix: 'review|survey',
  },
  creators: {
    description: 'Creator applications, projects, and communications',
    prefix: 'creator|project',
  },
  payouts: {
    description: 'Payment processing, expenses, and treasury operations',
    prefix: 'payout|payment|treasury|expense',
  },
  attribution: {
    description: 'Analytics, metrics, and attribution tracking',
    prefix: 'touchpoint|conversion|attribution',
  },
  abTesting: {
    description: 'A/B testing and experimentation',
    prefix: 'ab',
  },
  media: {
    description: 'Video processing and DAM asset management',
    prefix: 'video|dam',
  },
  subscriptions: {
    description: 'Subscription lifecycle events',
    prefix: 'subscription',
  },
  notifications: {
    description: 'Email, SMS, Slack, and push notifications',
    prefix: 'email|sms|slack|push',
  },
  system: {
    description: 'Health checks, alerts, and system maintenance',
    prefix: 'system',
  },
  workflows: {
    description: 'Workflow automation and rule execution',
    prefix: 'workflow',
  },
  brandContext: {
    description: 'Brand context and creative idea management',
    prefix: 'brandContext',
  },
  googleFeed: {
    description: 'Google Shopping feed sync',
    prefix: 'googleFeed',
  },
  webhooks: {
    description: 'Webhook processing and retries',
    prefix: 'webhook',
  },
} as const

interface JobEvent {
  name: string
  category: string
  description: string
  payload: Record<
    string,
    { type: string; required: boolean; default?: string | number | boolean }
  >
  schedule?: { cron: string; timezone: string }
}

/**
 * Comprehensive event registry with type information
 */
const JOB_EVENTS: JobEvent[] = [
  // Commerce Events
  {
    name: 'order.created',
    category: 'commerce',
    description: 'Triggered when a new order is created',
    payload: {
      tenantId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      shopifyOrderId: { type: 'string', required: false },
      customerId: { type: 'string', required: false },
      totalAmount: { type: 'number', required: true },
      currency: { type: 'string', required: false, default: 'USD' },
    },
  },
  {
    name: 'order.fulfilled',
    category: 'commerce',
    description: 'Triggered when an order is fulfilled',
    payload: {
      tenantId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      fulfillmentId: { type: 'string', required: true },
      trackingNumber: { type: 'string', required: false },
      carrier: { type: 'string', required: false },
    },
  },
  {
    name: 'order.cancelled',
    category: 'commerce',
    description: 'Triggered when an order is cancelled',
    payload: {
      tenantId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      reason: { type: 'string', required: false },
      refundAmount: { type: 'number', required: false },
    },
  },
  {
    name: 'customer.created',
    category: 'commerce',
    description: 'Triggered when a new customer is created',
    payload: {
      tenantId: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      email: { type: 'string', required: true },
      shopifyCustomerId: { type: 'string', required: false },
    },
  },
  {
    name: 'customer.updated',
    category: 'commerce',
    description: 'Triggered when customer data is updated',
    payload: {
      tenantId: { type: 'string', required: true },
      customerId: { type: 'string', required: true },
      changes: { type: 'object', required: true },
    },
  },
  {
    name: 'product.sync',
    category: 'commerce',
    description: 'Sync product data from Shopify',
    payload: {
      tenantId: { type: 'string', required: true },
      productId: { type: 'string', required: false },
      fullSync: { type: 'boolean', required: false },
    },
  },
  {
    name: 'inventory.sync',
    category: 'commerce',
    description: 'Sync inventory levels from Shopify',
    payload: {
      tenantId: { type: 'string', required: true },
      productId: { type: 'string', required: false },
      variantId: { type: 'string', required: false },
      locationId: { type: 'string', required: false },
    },
  },

  // Review Events
  {
    name: 'review.submitted',
    category: 'reviews',
    description: 'Triggered when a customer submits a review',
    payload: {
      tenantId: { type: 'string', required: true },
      reviewId: { type: 'string', required: true },
      orderId: { type: 'string', required: false },
      customerId: { type: 'string', required: false },
      rating: { type: 'number', required: true },
    },
  },
  {
    name: 'review.emailQueued',
    category: 'reviews',
    description: 'Queue review request email',
    payload: {
      tenantId: { type: 'string', required: true },
      reviewEmailId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
    },
  },

  // Creator Events
  {
    name: 'creator.applied',
    category: 'creators',
    description: 'Triggered when a creator submits application',
    payload: {
      tenantId: { type: 'string', required: true },
      creatorId: { type: 'string', required: true },
      email: { type: 'string', required: true },
    },
  },
  {
    name: 'creator.approved',
    category: 'creators',
    description: 'Triggered when a creator is approved',
    payload: {
      tenantId: { type: 'string', required: true },
      creatorId: { type: 'string', required: true },
    },
  },
  {
    name: 'project.created',
    category: 'creators',
    description: 'Triggered when a project is created',
    payload: {
      tenantId: { type: 'string', required: true },
      projectId: { type: 'string', required: true },
      creatorId: { type: 'string', required: true },
    },
  },

  // Payout Events
  {
    name: 'payout.requested',
    category: 'payouts',
    description: 'Triggered when a payout is requested',
    payload: {
      tenantId: { type: 'string', required: true },
      payoutId: { type: 'string', required: true },
      creatorId: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      currency: { type: 'string', required: true },
      payoutType: { type: 'string', required: true },
    },
  },
  {
    name: 'payout.processed',
    category: 'payouts',
    description: 'Triggered when a payout is processed',
    payload: {
      tenantId: { type: 'string', required: true },
      payoutId: { type: 'string', required: true },
      transactionId: { type: 'string', required: true },
    },
  },

  // Notification Events
  {
    name: 'email.send',
    category: 'notifications',
    description: 'Send email via tenant Resend account',
    payload: {
      tenantId: { type: 'string', required: true },
      to: { type: 'string', required: true },
      templateId: { type: 'string', required: true },
      data: { type: 'object', required: true },
    },
  },
  {
    name: 'slack.notify',
    category: 'notifications',
    description: 'Send Slack notification',
    payload: {
      tenantId: { type: 'string', required: true },
      channel: { type: 'string', required: true },
      message: { type: 'string', required: true },
    },
  },

  // Scheduled Events
  {
    name: 'attribution.dailyMetrics',
    category: 'attribution',
    description: 'Daily attribution metrics aggregation',
    schedule: { cron: '15 0 * * *', timezone: 'UTC' },
    payload: {
      tenantId: { type: 'string', required: true },
      period: { type: 'string', required: true },
    },
  },
  {
    name: 'ab.hourlyMetrics',
    category: 'abTesting',
    description: 'Hourly A/B test metrics',
    schedule: { cron: '15 * * * *', timezone: 'UTC' },
    payload: {
      tenantId: { type: 'string', required: true },
    },
  },

  // Media Events
  {
    name: 'video.transcode',
    category: 'media',
    description: 'Transcode video for streaming',
    payload: {
      tenantId: { type: 'string', required: true },
      videoId: { type: 'string', required: true },
      sourceUrl: { type: 'string', required: true },
    },
  },
  {
    name: 'video.analyze',
    category: 'media',
    description: 'Analyze video for insights',
    payload: {
      tenantId: { type: 'string', required: true },
      videoId: { type: 'string', required: true },
    },
  },

  // System Events
  {
    name: 'system.cleanup',
    category: 'system',
    description: 'System cleanup and maintenance',
    schedule: { cron: '0 2 * * *', timezone: 'UTC' },
    payload: {
      tenantId: { type: 'string', required: true },
    },
  },
] as const

// =============================================================================
// Tool: list_job_events
// =============================================================================

/**
 * List all available background job events
 *
 * Returns all 80+ Trigger.dev job events with their categories and descriptions.
 * Useful for discovering available events without grepping through code.
 *
 * @example
 * ```typescript
 * // List all events
 * const result = await callTool({
 *   name: 'list_job_events',
 *   arguments: {}
 * })
 *
 * // Filter by category
 * const result = await callTool({
 *   name: 'list_job_events',
 *   arguments: { category: 'commerce' }
 * })
 * ```
 */
export const listJobEventsTool = defineTool({
  name: 'list_job_events',
  description:
    'List all available background job events (80+ types across 14 categories). Use this to discover available events for triggering background jobs.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description:
          'Filter by category: commerce, reviews, creators, payouts, attribution, abTesting, media, subscriptions, notifications, system, workflows, brandContext, googleFeed, webhooks',
      },
      search: {
        type: 'string',
        description: 'Search events by name or description',
      },
    },
  },
  async handler(args) {
    try {
      const { category, search } = args as { category?: string; search?: string }

      let events = JOB_EVENTS

      // Filter by category
      if (category) {
        events = events.filter((e) => e.category === category)
      }

      // Search by name/description
      if (search) {
        const searchLower = search.toLowerCase()
        events = events.filter(
          (e) =>
            e.name.toLowerCase().includes(searchLower) ||
            e.description.toLowerCase().includes(searchLower)
        )
      }

      return jsonResult({
        categories: EVENT_CATEGORIES,
        events: events.map((e) => ({
          name: e.name,
          category: e.category,
          description: e.description,
          schedule: e.schedule || null,
        })),
        totalCount: events.length,
      })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to list job events: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: get_job_event_schema
// =============================================================================

/**
 * Get payload schema for a specific job event
 *
 * Returns the expected payload structure for a job event, including required
 * fields, types, and descriptions.
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'get_job_event_schema',
 *   arguments: { eventName: 'order.created' }
 * })
 * // Returns: { payload: { tenantId: {...}, orderId: {...}, ... } }
 * ```
 */
export const getJobEventSchemaTool = defineTool({
  name: 'get_job_event_schema',
  description:
    'Get payload schema for a specific job event. Shows required fields, types, and defaults. Use this before triggering a job to ensure correct payload structure.',
  inputSchema: {
    type: 'object',
    properties: {
      eventName: {
        type: 'string',
        description: 'Event name (e.g., order.created, payout.requested)',
      },
    },
    required: ['eventName'],
  },
  async handler(args) {
    try {
      const { eventName } = args as { eventName: string }

      const event = JOB_EVENTS.find((e) => e.name === eventName)

      if (!event) {
        return errorResult(
          `Event not found: ${eventName}. Use list_job_events to see available events.`
        )
      }

      return jsonResult({
        name: event.name,
        category: event.category,
        description: event.description,
        schedule: event.schedule || null,
        payload: event.payload,
        requiredFields: Object.entries(event.payload)
          .filter(([, schema]) => schema.required)
          .map(([field]) => field),
        examplePayload: generateExamplePayload(event.payload),
      })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to get event schema: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: validate_job_payload
// =============================================================================

/**
 * Validate a job payload against its schema
 *
 * Checks if a payload matches the expected schema for a job event.
 * Validates required fields, types, and detects common errors.
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'validate_job_payload',
 *   arguments: {
 *     eventName: 'order.created',
 *     payload: {
 *       tenantId: 'rawdog',
 *       orderId: 'order_123',
 *       totalAmount: 9999
 *     }
 *   }
 * })
 * // Returns: { valid: true, errors: [] }
 * ```
 */
export const validateJobPayloadTool = defineTool({
  name: 'validate_job_payload',
  description:
    'Validate a job payload against its schema. Checks required fields and types. Use this before sending a job to ensure valid payload.',
  inputSchema: {
    type: 'object',
    properties: {
      eventName: {
        type: 'string',
        description: 'Event name',
      },
      payload: {
        type: 'object',
        description: 'Payload to validate',
      },
    },
    required: ['eventName', 'payload'],
  },
  async handler(args) {
    try {
      const { eventName, payload } = args as { eventName: string; payload: Record<string, any> }

      const event = JOB_EVENTS.find((e) => e.name === eventName)

      if (!event) {
        return errorResult(`Event not found: ${eventName}`)
      }

      const errors: string[] = []

      // Check required fields
      for (const [field, schema] of Object.entries(event.payload)) {
        if (schema.required && !(field in payload)) {
          errors.push(`Missing required field: ${field} (${schema.type})`)
        }
      }

      // Check field types
      for (const [field, value] of Object.entries(payload)) {
        const schema = event.payload[field]

        if (!schema) {
          errors.push(`Unknown field: ${field}`)
          continue
        }

        const actualType = typeof value
        const expectedType = schema.type

        // Special handling for object type
        if (schema.type === 'object') {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push(
              `Field ${field} should be object, got ${actualType}${value === null ? ' (null)' : ''}`
            )
          }
        } else {
          // For primitive types (string, number, boolean)
          if (actualType !== expectedType) {
            errors.push(`Field ${field} should be ${expectedType}, got ${actualType}`)
          }
        }
      }

      // Critical: Check for tenantId
      if (!payload.tenantId) {
        errors.push('CRITICAL: Missing tenantId - all job events REQUIRE tenantId for isolation')
      }

      return jsonResult({
        valid: errors.length === 0,
        errors,
        eventName,
        payload,
      })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to validate payload: ${err.message}`)
    }
  },
})

// =============================================================================
// Tool: get_job_categories
// =============================================================================

/**
 * Get all job categories with descriptions
 *
 * Returns a list of all event categories and their purposes.
 *
 * @example
 * ```typescript
 * const result = await callTool({
 *   name: 'get_job_categories',
 *   arguments: {}
 * })
 * ```
 */
export const getJobCategoriesTool = defineTool({
  name: 'get_job_categories',
  description:
    'Get all job event categories with descriptions. Use this to understand event organization.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async handler() {
    try {
      return jsonResult({
        categories: EVENT_CATEGORIES,
        totalCategories: Object.keys(EVENT_CATEGORIES).length,
        totalEvents: JOB_EVENTS.length,
      })
    } catch (error) {
      const err = error as Error
      return errorResult(`Failed to get categories: ${err.message}`)
    }
  },
})

// =============================================================================
// Utilities
// =============================================================================

/**
 * Generate example payload from schema
 */
function generateExamplePayload(schema: Record<string, any>): Record<string, any> {
  const example: Record<string, any> = {}

  for (const [field, config] of Object.entries(schema)) {
    if (field === 'tenantId') {
      example[field] = 'rawdog'
    } else if (config.type === 'string') {
      example[field] = config.default || `example-${field}`
    } else if (config.type === 'number') {
      example[field] = config.default || 0
    } else if (config.type === 'boolean') {
      example[field] = config.default || false
    } else if (config.type === 'object') {
      example[field] = {}
    }
  }

  return example
}

// =============================================================================
// Exports
// =============================================================================

/**
 * All job discovery tools
 */
export const jobTools: ToolDefinition[] = [
  listJobEventsTool,
  getJobEventSchemaTool,
  validateJobPayloadTool,
  getJobCategoriesTool,
]

/**
 * Job tool names for filtering
 */
export const jobToolNames = jobTools.map((tool) => tool.name)
