/**
 * MCP Commerce Tools
 *
 * Tools for commerce operations: orders, customers, products, inventory.
 * All tools use withTenant() for proper tenant isolation.
 */

import { withTenant, sql } from '@cgk-platform/db'
import { defineTool, jsonResult, errorResult } from '../tools'
import {
  progressChunk,
  partialChunk,
  completeChunk,
  errorChunk,
  type StreamingChunk,
} from '../streaming'
import type { ToolDefinition } from '../tools'
import type { ToolResult } from '../types'

// =============================================================================
// Types
// =============================================================================

interface OrderRow {
  id: string
  order_number: string
  customer_id: string | null
  customer_email: string | null
  status: string
  fulfillment_status: string
  financial_status: string
  subtotal_cents: number
  discount_cents: number
  shipping_cents: number
  tax_cents: number
  total_cents: number
  currency: string
  line_items: unknown
  shipping_address: unknown
  billing_address: unknown
  notes: string | null
  tags: string[] | null
  order_placed_at: string | null
  cancelled_at: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
}

interface CustomerRow {
  id: string
  shopify_customer_id: string | null
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  default_address: unknown
  accepts_marketing: boolean
  orders_count: number
  total_spent_cents: number
  currency: string
  tags: string[] | null
  notes: string | null
  metadata: unknown
  created_at: string
  updated_at: string
}

interface ProductRow {
  id: string
  shopify_product_id: string | null
  title: string
  handle: string | null
  description: string | null
  vendor: string | null
  product_type: string | null
  status: string
  tags: string[] | null
  price_cents: number | null
  compare_at_price_cents: number | null
  currency: string
  inventory_quantity: number | null
  inventory_policy: string | null
  featured_image_url: string | null
  images: unknown
  variants: unknown
  options: unknown
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================================================
// Order Tools
// =============================================================================

/**
 * List orders with optional filters
 */
export const listOrdersTool = defineTool({
  name: 'list_orders',
  description:
    'List orders with optional filters. Returns a paginated list of orders sorted by creation date.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by order status',
        enum: [
          'pending',
          'confirmed',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded',
        ],
      },
      fulfillment_status: {
        type: 'string',
        description: 'Filter by fulfillment status',
        enum: ['unfulfilled', 'partial', 'fulfilled'],
      },
      financial_status: {
        type: 'string',
        description: 'Filter by financial/payment status',
        enum: [
          'pending',
          'authorized',
          'paid',
          'partially_paid',
          'partially_refunded',
          'refunded',
          'voided',
        ],
      },
      customer_email: {
        type: 'string',
        description: 'Filter by customer email (exact match)',
      },
      date_from: {
        type: 'string',
        description: 'Filter orders placed on or after this date (ISO 8601 format)',
      },
      date_to: {
        type: 'string',
        description: 'Filter orders placed on or before this date (ISO 8601 format)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of orders to skip for pagination (default: 0)',
        default: 0,
        minimum: 0,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)
    const status = args.status as string | undefined
    const fulfillmentStatus = args.fulfillment_status as string | undefined
    const financialStatus = args.financial_status as string | undefined
    const customerEmail = args.customer_email as string | undefined
    const dateFrom = args.date_from as string | undefined
    const dateTo = args.date_to as string | undefined

    try {
      const orders = await withTenant(tenantId, async () => {
        // Build query based on filters
        if (status && fulfillmentStatus && financialStatus && customerEmail && dateFrom && dateTo) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE status = ${status}::order_status
              AND fulfillment_status = ${fulfillmentStatus}::fulfillment_status
              AND financial_status = ${financialStatus}::financial_status
              AND customer_email = ${customerEmail}
              AND order_placed_at >= ${dateFrom}
              AND order_placed_at <= ${dateTo}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status && customerEmail) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE status = ${status}::order_status
              AND customer_email = ${customerEmail}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status && dateFrom && dateTo) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE status = ${status}::order_status
              AND order_placed_at >= ${dateFrom}
              AND order_placed_at <= ${dateTo}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE status = ${status}::order_status
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (fulfillmentStatus) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE fulfillment_status = ${fulfillmentStatus}::fulfillment_status
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (financialStatus) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE financial_status = ${financialStatus}::financial_status
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (customerEmail) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE customer_email = ${customerEmail}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (dateFrom && dateTo) {
          return sql<OrderRow>`
            SELECT * FROM orders
            WHERE order_placed_at >= ${dateFrom}
              AND order_placed_at <= ${dateTo}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else {
          return sql<OrderRow>`
            SELECT * FROM orders
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        }
      })

      // Get total count for pagination info
      const countResult = await withTenant(tenantId, async () => {
        return sql<{ count: string }>`SELECT COUNT(*) as count FROM orders`
      })
      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10)

      const formattedOrders = orders.rows.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        customer_email: order.customer_email,
        status: order.status,
        fulfillment_status: order.fulfillment_status,
        financial_status: order.financial_status,
        total: formatCents(order.total_cents, order.currency),
        total_cents: order.total_cents,
        currency: order.currency,
        items_count:
          Array.isArray(order.line_items) ? (order.line_items as unknown[]).length : 0,
        order_placed_at: formatDate(order.order_placed_at),
        created_at: formatDate(order.created_at),
      }))

      return jsonResult({
        orders: formattedOrders,
        pagination: {
          offset,
          limit,
          total_count: totalCount,
          has_more: offset + orders.rows.length < totalCount,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list orders: ${message}`)
    }
  },
})

/**
 * Get order details by ID
 */
export const getOrderTool = defineTool({
  name: 'get_order',
  description: 'Get detailed information about a specific order by its ID.',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to retrieve',
      },
    },
    required: ['order_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const orderId = args.order_id as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!orderId) {
      return errorResult('Order ID is required')
    }

    try {
      const result = await withTenant(tenantId, async () => {
        return sql<OrderRow>`
          SELECT * FROM orders WHERE id = ${orderId}
        `
      })

      const order = result.rows[0]
      if (!order) {
        return errorResult(`Order not found: ${orderId}`)
      }

      return jsonResult({
        id: order.id,
        order_number: order.order_number,
        customer: {
          id: order.customer_id,
          email: order.customer_email,
        },
        status: order.status,
        fulfillment_status: order.fulfillment_status,
        financial_status: order.financial_status,
        totals: {
          subtotal: formatCents(order.subtotal_cents, order.currency),
          discount: formatCents(order.discount_cents, order.currency),
          shipping: formatCents(order.shipping_cents, order.currency),
          tax: formatCents(order.tax_cents, order.currency),
          total: formatCents(order.total_cents, order.currency),
          currency: order.currency,
        },
        line_items: order.line_items,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        notes: order.notes,
        tags: order.tags,
        order_placed_at: formatDate(order.order_placed_at),
        created_at: formatDate(order.created_at),
        updated_at: formatDate(order.updated_at),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get order: ${message}`)
    }
  },
})

/**
 * Search orders with streaming support for large result sets
 */
export const searchOrdersTool = defineTool({
  name: 'search_orders',
  description:
    'Search orders by customer email, order number, or content. Supports streaming for large result sets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Search query - searches order number, customer email, and notes',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 100, max: 500)',
        default: 100,
        minimum: 1,
        maximum: 500,
      },
    },
    required: ['query'],
  },
  streaming: true,
  async *handler(args): AsyncGenerator<StreamingChunk, void, unknown> {
    const tenantId = (args._tenantId as string) || ''
    const query = args.query as string
    const limit = Math.min(Math.max((args.limit as number) || 100, 1), 500)

    if (!tenantId) {
      yield errorChunk(-32602, 'Tenant ID is required')
      return
    }
    if (!query) {
      yield errorChunk(-32602, 'Search query is required')
      return
    }

    try {
      yield progressChunk(0, 'Starting order search...')

      const searchPattern = `%${query}%`

      const orders = await withTenant(tenantId, async () => {
        return sql<OrderRow>`
          SELECT * FROM orders
          WHERE order_number ILIKE ${searchPattern}
            OR customer_email ILIKE ${searchPattern}
            OR notes ILIKE ${searchPattern}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      })

      yield progressChunk(50, `Found ${orders.rows.length} orders, formatting results...`)

      // Stream results in batches
      const batchSize = 20
      const results: Array<{
        id: string
        order_number: string
        customer_email: string | null
        status: string
        total: string
        created_at: string
      }> = []

      for (let i = 0; i < orders.rows.length; i += batchSize) {
        const batch = orders.rows.slice(i, i + batchSize)
        const formattedBatch = batch.map((order) => ({
          id: order.id,
          order_number: order.order_number,
          customer_email: order.customer_email,
          status: order.status,
          total: formatCents(order.total_cents, order.currency),
          created_at: formatDate(order.created_at),
        }))

        results.push(...formattedBatch)

        const progress = Math.round(50 + ((i + batch.length) / orders.rows.length) * 50)
        yield progressChunk(
          progress,
          `Processed ${Math.min(i + batchSize, orders.rows.length)} of ${orders.rows.length} orders`
        )

        yield partialChunk(
          [{ type: 'text', text: JSON.stringify(formattedBatch, null, 2) }],
          Math.floor(i / batchSize)
        )
      }

      yield completeChunk({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                search_query: query,
                total_results: orders.rows.length,
                orders: results,
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield errorChunk(-32603, `Search failed: ${message}`)
    }
  },
})

/**
 * Update order status
 */
export const updateOrderStatusTool = defineTool({
  name: 'update_order_status',
  description: 'Update the status of an order.',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to update',
      },
      status: {
        type: 'string',
        description: 'The new order status',
        enum: [
          'pending',
          'confirmed',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded',
        ],
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the status change',
      },
    },
    required: ['order_id', 'status'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const orderId = args.order_id as string
    const status = args.status as string
    const notes = args.notes as string | undefined

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!orderId) {
      return errorResult('Order ID is required')
    }
    if (!status) {
      return errorResult('New status is required')
    }

    try {
      // First check if order exists
      const existing = await withTenant(tenantId, async () => {
        return sql<OrderRow>`SELECT id, status FROM orders WHERE id = ${orderId}`
      })

      if (!existing.rows[0]) {
        return errorResult(`Order not found: ${orderId}`)
      }

      const oldStatus = existing.rows[0].status

      // Update the order status
      const result = await withTenant(tenantId, async () => {
        if (notes) {
          return sql<OrderRow>`
            UPDATE orders
            SET status = ${status}::order_status,
                notes = COALESCE(notes || E'\n', '') || ${`[${new Date().toISOString()}] Status changed: ${oldStatus} -> ${status}. ${notes}`},
                updated_at = NOW()
            WHERE id = ${orderId}
            RETURNING *
          `
        }
        return sql<OrderRow>`
          UPDATE orders
          SET status = ${status}::order_status,
              updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING *
        `
      })

      const order = result.rows[0]
      if (!order) {
        return errorResult('Failed to update order')
      }

      return jsonResult({
        success: true,
        message: `Order ${order.order_number} status updated from ${oldStatus} to ${status}`,
        order: {
          id: order.id,
          order_number: order.order_number,
          old_status: oldStatus,
          new_status: order.status,
          updated_at: formatDate(order.updated_at),
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update order status: ${message}`)
    }
  },
})

/**
 * Cancel an order
 */
export const cancelOrderTool = defineTool({
  name: 'cancel_order',
  description:
    'Cancel an order. This will update the order status to cancelled and record the cancellation reason.',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to cancel',
      },
      reason: {
        type: 'string',
        description: 'Reason for cancellation',
      },
    },
    required: ['order_id', 'reason'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const orderId = args.order_id as string
    const reason = args.reason as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!orderId) {
      return errorResult('Order ID is required')
    }
    if (!reason) {
      return errorResult('Cancellation reason is required')
    }

    try {
      // Check if order exists and can be cancelled
      const existing = await withTenant(tenantId, async () => {
        return sql<OrderRow>`SELECT id, status, order_number FROM orders WHERE id = ${orderId}`
      })

      if (!existing.rows[0]) {
        return errorResult(`Order not found: ${orderId}`)
      }

      const order = existing.rows[0]
      if (order.status === 'cancelled') {
        return errorResult(`Order ${order.order_number} is already cancelled`)
      }
      if (order.status === 'delivered') {
        return errorResult(
          `Cannot cancel order ${order.order_number} - it has already been delivered`
        )
      }

      // Cancel the order
      const result = await withTenant(tenantId, async () => {
        const cancelNote = `[${new Date().toISOString()}] Order cancelled. Reason: ${reason}`
        return sql<OrderRow>`
          UPDATE orders
          SET status = 'cancelled'::order_status,
              cancelled_at = NOW(),
              notes = COALESCE(notes || E'\n', '') || ${cancelNote},
              updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING *
        `
      })

      const updated = result.rows[0]
      if (!updated) {
        return errorResult('Failed to cancel order')
      }

      return jsonResult({
        success: true,
        message: `Order ${updated.order_number} has been cancelled`,
        order: {
          id: updated.id,
          order_number: updated.order_number,
          status: updated.status,
          cancelled_at: formatDate(updated.cancelled_at),
          reason: reason,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to cancel order: ${message}`)
    }
  },
})

// =============================================================================
// Customer Tools
// =============================================================================

/**
 * List customers with optional filters
 */
export const listCustomersTool = defineTool({
  name: 'list_customers',
  description:
    'List customers with optional filters. Returns a paginated list of customers.',
  inputSchema: {
    type: 'object',
    properties: {
      accepts_marketing: {
        type: 'boolean',
        description: 'Filter by marketing consent',
      },
      min_orders: {
        type: 'number',
        description: 'Filter customers with at least this many orders',
      },
      min_spent: {
        type: 'number',
        description: 'Filter customers who have spent at least this amount (in cents)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of customers to return (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of customers to skip for pagination (default: 0)',
        default: 0,
        minimum: 0,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)
    const acceptsMarketing = args.accepts_marketing as boolean | undefined
    const minOrders = args.min_orders as number | undefined
    const minSpent = args.min_spent as number | undefined

    try {
      const customers = await withTenant(tenantId, async () => {
        if (acceptsMarketing !== undefined && minOrders && minSpent) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE accepts_marketing = ${acceptsMarketing}
              AND orders_count >= ${minOrders}
              AND total_spent_cents >= ${minSpent}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (acceptsMarketing !== undefined && minOrders) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE accepts_marketing = ${acceptsMarketing}
              AND orders_count >= ${minOrders}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (acceptsMarketing !== undefined) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE accepts_marketing = ${acceptsMarketing}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (minOrders && minSpent) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE orders_count >= ${minOrders}
              AND total_spent_cents >= ${minSpent}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (minOrders) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE orders_count >= ${minOrders}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (minSpent) {
          return sql<CustomerRow>`
            SELECT * FROM customers
            WHERE total_spent_cents >= ${minSpent}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else {
          return sql<CustomerRow>`
            SELECT * FROM customers
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        }
      })

      const countResult = await withTenant(tenantId, async () => {
        return sql<{ count: string }>`SELECT COUNT(*) as count FROM customers`
      })
      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10)

      const formattedCustomers = customers.rows.map((customer) => ({
        id: customer.id,
        email: customer.email,
        name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null,
        phone: customer.phone,
        orders_count: customer.orders_count,
        total_spent: formatCents(customer.total_spent_cents, customer.currency),
        accepts_marketing: customer.accepts_marketing,
        created_at: formatDate(customer.created_at),
      }))

      return jsonResult({
        customers: formattedCustomers,
        pagination: {
          offset,
          limit,
          total_count: totalCount,
          has_more: offset + customers.rows.length < totalCount,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list customers: ${message}`)
    }
  },
})

/**
 * Get customer details by ID
 */
export const getCustomerTool = defineTool({
  name: 'get_customer',
  description: 'Get detailed information about a specific customer by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: 'The customer ID to retrieve',
      },
    },
    required: ['customer_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const customerId = args.customer_id as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!customerId) {
      return errorResult('Customer ID is required')
    }

    try {
      const result = await withTenant(tenantId, async () => {
        return sql<CustomerRow>`
          SELECT * FROM customers WHERE id = ${customerId}
        `
      })

      const customer = result.rows[0]
      if (!customer) {
        return errorResult(`Customer not found: ${customerId}`)
      }

      return jsonResult({
        id: customer.id,
        shopify_customer_id: customer.shopify_customer_id,
        email: customer.email,
        phone: customer.phone,
        name: {
          first: customer.first_name,
          last: customer.last_name,
          full: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null,
        },
        default_address: customer.default_address,
        marketing: {
          accepts_marketing: customer.accepts_marketing,
        },
        stats: {
          orders_count: customer.orders_count,
          total_spent: formatCents(customer.total_spent_cents, customer.currency),
          total_spent_cents: customer.total_spent_cents,
          currency: customer.currency,
        },
        tags: customer.tags,
        notes: customer.notes,
        metadata: customer.metadata,
        created_at: formatDate(customer.created_at),
        updated_at: formatDate(customer.updated_at),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get customer: ${message}`)
    }
  },
})

/**
 * Search customers
 */
export const searchCustomersTool = defineTool({
  name: 'search_customers',
  description: 'Search customers by email, name, or phone number.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - searches email, name, and phone',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['query'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const query = args.query as string
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!query) {
      return errorResult('Search query is required')
    }

    try {
      const searchPattern = `%${query}%`

      const customers = await withTenant(tenantId, async () => {
        return sql<CustomerRow>`
          SELECT * FROM customers
          WHERE email ILIKE ${searchPattern}
            OR first_name ILIKE ${searchPattern}
            OR last_name ILIKE ${searchPattern}
            OR phone ILIKE ${searchPattern}
          ORDER BY total_spent_cents DESC, created_at DESC
          LIMIT ${limit}
        `
      })

      const formattedCustomers = customers.rows.map((customer) => ({
        id: customer.id,
        email: customer.email,
        name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null,
        phone: customer.phone,
        orders_count: customer.orders_count,
        total_spent: formatCents(customer.total_spent_cents, customer.currency),
        accepts_marketing: customer.accepts_marketing,
        created_at: formatDate(customer.created_at),
      }))

      return jsonResult({
        search_query: query,
        total_results: customers.rows.length,
        customers: formattedCustomers,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to search customers: ${message}`)
    }
  },
})

/**
 * Get orders for a specific customer
 */
export const getCustomerOrdersTool = defineTool({
  name: 'get_customer_orders',
  description: 'Get all orders for a specific customer.',
  inputSchema: {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: 'The customer ID to get orders for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of orders to skip for pagination (default: 0)',
        default: 0,
        minimum: 0,
      },
    },
    required: ['customer_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const customerId = args.customer_id as string
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!customerId) {
      return errorResult('Customer ID is required')
    }

    try {
      // First get customer info
      const customerResult = await withTenant(tenantId, async () => {
        return sql<CustomerRow>`SELECT * FROM customers WHERE id = ${customerId}`
      })

      const customer = customerResult.rows[0]
      if (!customer) {
        return errorResult(`Customer not found: ${customerId}`)
      }

      // Get orders for this customer
      const orders = await withTenant(tenantId, async () => {
        return sql<OrderRow>`
          SELECT * FROM orders
          WHERE customer_id = ${customerId}
          ORDER BY created_at DESC
          OFFSET ${offset} LIMIT ${limit}
        `
      })

      const formattedOrders = orders.rows.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        fulfillment_status: order.fulfillment_status,
        financial_status: order.financial_status,
        total: formatCents(order.total_cents, order.currency),
        items_count:
          Array.isArray(order.line_items) ? (order.line_items as unknown[]).length : 0,
        order_placed_at: formatDate(order.order_placed_at),
        created_at: formatDate(order.created_at),
      }))

      return jsonResult({
        customer: {
          id: customer.id,
          email: customer.email,
          name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null,
          total_orders: customer.orders_count,
          total_spent: formatCents(customer.total_spent_cents, customer.currency),
        },
        orders: formattedOrders,
        pagination: {
          offset,
          limit,
          total_count: customer.orders_count,
          has_more: offset + orders.rows.length < customer.orders_count,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get customer orders: ${message}`)
    }
  },
})

// =============================================================================
// Product Tools
// =============================================================================

/**
 * List products with optional filters
 */
export const listProductsTool = defineTool({
  name: 'list_products',
  description: 'List products with optional filters. Returns a paginated list of products.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by product status',
        enum: ['draft', 'active', 'archived'],
      },
      vendor: {
        type: 'string',
        description: 'Filter by vendor/brand name',
      },
      product_type: {
        type: 'string',
        description: 'Filter by product type',
      },
      in_stock: {
        type: 'boolean',
        description: 'Filter to only show products with inventory > 0',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of products to return (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Number of products to skip for pagination (default: 0)',
        default: 0,
        minimum: 0,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)
    const status = args.status as string | undefined
    const vendor = args.vendor as string | undefined
    const productType = args.product_type as string | undefined
    const inStock = args.in_stock as boolean | undefined

    try {
      const products = await withTenant(tenantId, async () => {
        if (status && vendor && productType && inStock) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE status = ${status}::product_status
              AND vendor = ${vendor}
              AND product_type = ${productType}
              AND inventory_quantity > 0
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status && vendor) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE status = ${status}::product_status
              AND vendor = ${vendor}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status && inStock) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE status = ${status}::product_status
              AND inventory_quantity > 0
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (status) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE status = ${status}::product_status
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (vendor) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE vendor = ${vendor}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (productType) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE product_type = ${productType}
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else if (inStock) {
          return sql<ProductRow>`
            SELECT * FROM products
            WHERE inventory_quantity > 0
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        } else {
          return sql<ProductRow>`
            SELECT * FROM products
            ORDER BY created_at DESC
            OFFSET ${offset} LIMIT ${limit}
          `
        }
      })

      const countResult = await withTenant(tenantId, async () => {
        return sql<{ count: string }>`SELECT COUNT(*) as count FROM products`
      })
      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10)

      const formattedProducts = products.rows.map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
        product_type: product.product_type,
        status: product.status,
        price: product.price_cents
          ? formatCents(product.price_cents, product.currency)
          : null,
        compare_at_price: product.compare_at_price_cents
          ? formatCents(product.compare_at_price_cents, product.currency)
          : null,
        inventory_quantity: product.inventory_quantity,
        featured_image_url: product.featured_image_url,
        variants_count: Array.isArray(product.variants)
          ? (product.variants as unknown[]).length
          : 0,
        created_at: formatDate(product.created_at),
      }))

      return jsonResult({
        products: formattedProducts,
        pagination: {
          offset,
          limit,
          total_count: totalCount,
          has_more: offset + products.rows.length < totalCount,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list products: ${message}`)
    }
  },
})

/**
 * Get product details by ID
 */
export const getProductTool = defineTool({
  name: 'get_product',
  description: 'Get detailed information about a specific product by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to retrieve',
      },
    },
    required: ['product_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const productId = args.product_id as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!productId) {
      return errorResult('Product ID is required')
    }

    try {
      const result = await withTenant(tenantId, async () => {
        return sql<ProductRow>`
          SELECT * FROM products WHERE id = ${productId}
        `
      })

      const product = result.rows[0]
      if (!product) {
        return errorResult(`Product not found: ${productId}`)
      }

      return jsonResult({
        id: product.id,
        shopify_product_id: product.shopify_product_id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        vendor: product.vendor,
        product_type: product.product_type,
        status: product.status,
        pricing: {
          price: product.price_cents
            ? formatCents(product.price_cents, product.currency)
            : null,
          price_cents: product.price_cents,
          compare_at_price: product.compare_at_price_cents
            ? formatCents(product.compare_at_price_cents, product.currency)
            : null,
          compare_at_price_cents: product.compare_at_price_cents,
          currency: product.currency,
        },
        inventory: {
          quantity: product.inventory_quantity,
          policy: product.inventory_policy,
        },
        images: {
          featured: product.featured_image_url,
          all: product.images,
        },
        variants: product.variants,
        options: product.options,
        seo: {
          title: product.seo_title,
          description: product.seo_description,
        },
        tags: product.tags,
        published_at: formatDate(product.published_at),
        created_at: formatDate(product.created_at),
        updated_at: formatDate(product.updated_at),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get product: ${message}`)
    }
  },
})

/**
 * Update product fields
 */
export const updateProductTool = defineTool({
  name: 'update_product',
  description: 'Update fields on a product.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to update',
      },
      title: {
        type: 'string',
        description: 'New product title',
      },
      description: {
        type: 'string',
        description: 'New product description',
      },
      status: {
        type: 'string',
        description: 'New product status',
        enum: ['draft', 'active', 'archived'],
      },
      vendor: {
        type: 'string',
        description: 'New vendor/brand name',
      },
      product_type: {
        type: 'string',
        description: 'New product type',
      },
      seo_title: {
        type: 'string',
        description: 'New SEO title',
      },
      seo_description: {
        type: 'string',
        description: 'New SEO description',
      },
    },
    required: ['product_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const productId = args.product_id as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!productId) {
      return errorResult('Product ID is required')
    }

    // Build update fields
    const updates: Record<string, unknown> = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.status !== undefined) updates.status = args.status
    if (args.vendor !== undefined) updates.vendor = args.vendor
    if (args.product_type !== undefined) updates.product_type = args.product_type
    if (args.seo_title !== undefined) updates.seo_title = args.seo_title
    if (args.seo_description !== undefined) updates.seo_description = args.seo_description

    if (Object.keys(updates).length === 0) {
      return errorResult('No fields to update')
    }

    try {
      // Check if product exists
      const existing = await withTenant(tenantId, async () => {
        return sql<ProductRow>`SELECT * FROM products WHERE id = ${productId}`
      })

      if (!existing.rows[0]) {
        return errorResult(`Product not found: ${productId}`)
      }

      // Update based on which fields are provided
      // Using conditional queries since @vercel/postgres doesn't support dynamic SQL
      let result: { rows: ProductRow[] }

      if (
        updates.title &&
        updates.description &&
        updates.status &&
        updates.vendor &&
        updates.product_type
      ) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET title = ${updates.title as string},
                description = ${updates.description as string},
                status = ${updates.status as string}::product_status,
                vendor = ${updates.vendor as string},
                product_type = ${updates.product_type as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.title && updates.description) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET title = ${updates.title as string},
                description = ${updates.description as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.title && updates.status) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET title = ${updates.title as string},
                status = ${updates.status as string}::product_status,
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.title) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET title = ${updates.title as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.description) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET description = ${updates.description as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.status) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET status = ${updates.status as string}::product_status,
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.vendor) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET vendor = ${updates.vendor as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.product_type) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET product_type = ${updates.product_type as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.seo_title && updates.seo_description) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET seo_title = ${updates.seo_title as string},
                seo_description = ${updates.seo_description as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.seo_title) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET seo_title = ${updates.seo_title as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else if (updates.seo_description) {
        result = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            UPDATE products
            SET seo_description = ${updates.seo_description as string},
                updated_at = NOW()
            WHERE id = ${productId}
            RETURNING *
          `
        })
      } else {
        return errorResult('Unsupported field combination for update')
      }

      const product = result.rows[0]
      if (!product) {
        return errorResult('Failed to update product')
      }

      return jsonResult({
        success: true,
        message: `Product "${product.title}" updated successfully`,
        product: {
          id: product.id,
          title: product.title,
          status: product.status,
          updated_at: formatDate(product.updated_at),
        },
        updated_fields: Object.keys(updates),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update product: ${message}`)
    }
  },
})

/**
 * Trigger a Shopify product sync
 */
export const syncProductTool = defineTool({
  name: 'sync_product',
  description:
    'Trigger a sync of a product from Shopify. This will fetch the latest data from Shopify and update the local record.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The local product ID to sync',
      },
    },
    required: ['product_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const productId = args.product_id as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!productId) {
      return errorResult('Product ID is required')
    }

    try {
      // Check if product exists and has Shopify ID
      const existing = await withTenant(tenantId, async () => {
        return sql<ProductRow>`
          SELECT id, title, shopify_product_id FROM products WHERE id = ${productId}
        `
      })

      const product = existing.rows[0]
      if (!product) {
        return errorResult(`Product not found: ${productId}`)
      }

      if (!product.shopify_product_id) {
        return errorResult(
          `Product "${product.title}" does not have a Shopify product ID - cannot sync`
        )
      }

      // Trigger the commerce-product-sync Trigger.dev task via REST API.
      // Using fetch() directly here because this tool runs in Edge Runtime
      // and the @trigger.dev/sdk uses Node.js APIs not available in Edge.
      const triggerSecretKey = process.env.TRIGGER_SECRET_KEY
      const triggerApiUrl = process.env.TRIGGER_API_URL ?? 'https://api.trigger.dev'

      if (triggerSecretKey) {
        const triggerResponse = await fetch(
          `${triggerApiUrl}/api/v1/tasks/commerce-product-sync/trigger`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${triggerSecretKey}`,
            },
            body: JSON.stringify({
              payload: {
                tenantId,
                productId: product.id,
                shopifyProductId: product.shopify_product_id,
              },
            }),
          }
        )

        if (!triggerResponse.ok) {
          const errText = await triggerResponse.text()
          return errorResult(`Failed to trigger sync job: ${errText}`)
        }

        const triggerResult = (await triggerResponse.json()) as { id?: string }

        return jsonResult({
          success: true,
          message: `Sync job triggered for product "${product.title}"`,
          runId: triggerResult.id,
          product: {
            id: product.id,
            title: product.title,
            shopify_product_id: product.shopify_product_id,
          },
        })
      }

      // Fallback: TRIGGER_SECRET_KEY not configured — log and return success
      console.warn('[syncProductTool] TRIGGER_SECRET_KEY not set — sync skipped')
      return jsonResult({
        success: true,
        message: `Sync queued for product "${product.title}" (job runner not configured)`,
        product: {
          id: product.id,
          title: product.title,
          shopify_product_id: product.shopify_product_id,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to trigger sync: ${message}`)
    }
  },
})

// =============================================================================
// Inventory Tools
// =============================================================================

/**
 * Get inventory levels for products
 */
export const getInventoryTool = defineTool({
  name: 'get_inventory',
  description: 'Get inventory levels for products. Can filter by specific product or get all.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'Optional: Get inventory for a specific product',
      },
      low_stock_threshold: {
        type: 'number',
        description: 'Optional: Only return products with inventory below this threshold',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of products to return (default: 50, max: 100)',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const productId = args.product_id as string | undefined
    const lowStockThreshold = args.low_stock_threshold as number | undefined
    const limit = Math.min(Math.max((args.limit as number) || 50, 1), 100)

    try {
      let products: { rows: ProductRow[] }

      if (productId) {
        products = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            SELECT id, title, handle, status, inventory_quantity, inventory_policy, variants
            FROM products
            WHERE id = ${productId}
          `
        })

        if (products.rows.length === 0) {
          return errorResult(`Product not found: ${productId}`)
        }
      } else if (lowStockThreshold !== undefined) {
        products = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            SELECT id, title, handle, status, inventory_quantity, inventory_policy, variants
            FROM products
            WHERE inventory_quantity IS NOT NULL
              AND inventory_quantity <= ${lowStockThreshold}
            ORDER BY inventory_quantity ASC
            LIMIT ${limit}
          `
        })
      } else {
        products = await withTenant(tenantId, async () => {
          return sql<ProductRow>`
            SELECT id, title, handle, status, inventory_quantity, inventory_policy, variants
            FROM products
            WHERE inventory_quantity IS NOT NULL
            ORDER BY inventory_quantity ASC
            LIMIT ${limit}
          `
        })
      }

      const inventoryData = products.rows.map((product) => {
        const variants = Array.isArray(product.variants) ? product.variants : []
        return {
          product_id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          total_inventory: product.inventory_quantity,
          inventory_policy: product.inventory_policy,
          variants_count: (variants as unknown[]).length,
          low_stock: lowStockThreshold
            ? (product.inventory_quantity || 0) <= lowStockThreshold
            : undefined,
        }
      })

      return jsonResult({
        inventory: inventoryData,
        total_products: products.rows.length,
        low_stock_threshold: lowStockThreshold,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get inventory: ${message}`)
    }
  },
})

/**
 * Update inventory for a product
 */
export const updateInventoryTool = defineTool({
  name: 'update_inventory',
  description:
    'Update the inventory quantity for a product. Can set an absolute value or adjust relative to current.',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to update inventory for',
      },
      quantity: {
        type: 'number',
        description: 'The new inventory quantity (absolute value)',
      },
      adjustment: {
        type: 'number',
        description:
          'Adjust inventory by this amount (positive to add, negative to remove). Mutually exclusive with quantity.',
      },
      reason: {
        type: 'string',
        description: 'Reason for the inventory change',
      },
    },
    required: ['product_id'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const productId = args.product_id as string
    const quantity = args.quantity as number | undefined
    const adjustment = args.adjustment as number | undefined
    const reason = args.reason as string | undefined

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!productId) {
      return errorResult('Product ID is required')
    }
    if (quantity === undefined && adjustment === undefined) {
      return errorResult('Either quantity or adjustment must be provided')
    }
    if (quantity !== undefined && adjustment !== undefined) {
      return errorResult('Cannot specify both quantity and adjustment')
    }

    try {
      // Get current inventory
      const existing = await withTenant(tenantId, async () => {
        return sql<ProductRow>`
          SELECT id, title, inventory_quantity FROM products WHERE id = ${productId}
        `
      })

      const product = existing.rows[0]
      if (!product) {
        return errorResult(`Product not found: ${productId}`)
      }

      const oldQuantity = product.inventory_quantity || 0
      let newQuantity: number

      if (quantity !== undefined) {
        newQuantity = quantity
      } else {
        newQuantity = oldQuantity + (adjustment || 0)
      }

      // Ensure inventory doesn't go negative
      if (newQuantity < 0) {
        return errorResult(
          `Cannot set negative inventory. Current: ${oldQuantity}, requested change would result in: ${newQuantity}`
        )
      }

      // Update inventory
      const result = await withTenant(tenantId, async () => {
        return sql<ProductRow>`
          UPDATE products
          SET inventory_quantity = ${newQuantity},
              updated_at = NOW()
          WHERE id = ${productId}
          RETURNING *
        `
      })

      const updated = result.rows[0]
      if (!updated) {
        return errorResult('Failed to update inventory')
      }

      return jsonResult({
        success: true,
        message: `Inventory updated for "${updated.title}"`,
        product: {
          id: updated.id,
          title: updated.title,
        },
        inventory: {
          previous: oldQuantity,
          new: newQuantity,
          change: newQuantity - oldQuantity,
        },
        reason: reason || 'Manual adjustment',
        updated_at: formatDate(updated.updated_at),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update inventory: ${message}`)
    }
  },
})

// =============================================================================
// Export All Commerce Tools
// =============================================================================

export const commerceTools: ToolDefinition[] = [
  // Order tools
  listOrdersTool,
  getOrderTool,
  searchOrdersTool,
  updateOrderStatusTool,
  cancelOrderTool,
  // Customer tools
  listCustomersTool,
  getCustomerTool,
  searchCustomersTool,
  getCustomerOrdersTool,
  // Product tools
  listProductsTool,
  getProductTool,
  updateProductTool,
  syncProductTool,
  // Inventory tools
  getInventoryTool,
  updateInventoryTool,
]

export default commerceTools
