/**
 * MCP Resource definition utilities
 *
 * Resources provide read-only data access in MCP.
 * Unlike tools, resources are for static or semi-static data.
 */

import type { ResourceContents } from './types'

/**
 * Context passed to resource handlers
 */
export interface ResourceContext {
  tenantId: string
  userId: string
}

/**
 * Resource handler function type - receives tenant context
 */
export type ResourceHandler = (context: ResourceContext) => Promise<ResourceContents>

/**
 * Resource definition
 */
export interface ResourceDefinition {
  uri: string
  name: string
  description?: string
  mimeType?: string
  handler: ResourceHandler
}

/**
 * Define an MCP resource
 */
export function defineResource(definition: ResourceDefinition): ResourceDefinition {
  return definition
}

/**
 * Core platform resources with real database queries
 */
export const platformResources = {
  /**
   * Current tenant information
   */
  tenantInfo: defineResource({
    uri: 'cgk://tenant/current',
    name: 'Current Tenant',
    description: 'Information about the current tenant including configuration',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      // Dynamic import to avoid circular dependencies
      const { sql } = await import('@cgk-platform/db')

      // Query organization info from public schema
      const result = await sql`
        SELECT
          id,
          slug,
          name,
          subscription_plan,
          settings,
          created_at,
          updated_at
        FROM public.organizations
        WHERE id = ${tenantId}
      `

      const org = result.rows[0]
      if (!org) {
        return {
          uri: 'cgk://tenant/current',
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Tenant not found' }),
        }
      }

      return {
        uri: 'cgk://tenant/current',
        mimeType: 'application/json',
        text: JSON.stringify({
          id: org.id,
          slug: org.slug,
          name: org.name,
          plan: org.subscription_plan,
          settings: org.settings || {},
          createdAt: org.created_at,
          updatedAt: org.updated_at,
        }, null, 2),
      }
    },
  }),

  /**
   * Current user information
   */
  userInfo: defineResource({
    uri: 'cgk://user/current',
    name: 'Current User',
    description: 'Information about the currently authenticated user',
    mimeType: 'application/json',
    async handler(context) {
      const { userId, tenantId } = context

      const { sql } = await import('@cgk-platform/db')

      // Get user info and their role for this tenant
      const result = await sql`
        SELECT
          u.id,
          u.email,
          u.name,
          u.image,
          u.created_at,
          ur.role
        FROM public.users u
        LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.tenant_id = ${tenantId}
        WHERE u.id = ${userId}
      `

      const user = result.rows[0]
      if (!user) {
        return {
          uri: 'cgk://user/current',
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'User not found' }),
        }
      }

      return {
        uri: 'cgk://user/current',
        mimeType: 'application/json',
        text: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role || 'member',
          createdAt: user.created_at,
        }, null, 2),
      }
    },
  }),

  /**
   * Tenant feature configuration
   */
  featureConfig: defineResource({
    uri: 'cgk://config/features',
    name: 'Feature Configuration',
    description: 'Enabled features and capabilities for the current tenant',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      const { sql } = await import('@cgk-platform/db')

      // Get enabled feature flags for this tenant
      const result = await sql`
        SELECT
          f.key,
          f.name,
          f.description,
          COALESCE(tf.enabled, f.default_enabled) as enabled,
          tf.config
        FROM public.feature_flags f
        LEFT JOIN public.tenant_feature_flags tf
          ON tf.feature_flag_id = f.id AND tf.tenant_id = ${tenantId}
        WHERE f.status = 'active'
        ORDER BY f.key
      `

      const features: Record<string, { enabled: boolean; config?: unknown }> = {}
      for (const row of result.rows) {
        features[row.key as string] = {
          enabled: row.enabled as boolean,
          config: row.config,
        }
      }

      return {
        uri: 'cgk://config/features',
        mimeType: 'application/json',
        text: JSON.stringify(features, null, 2),
      }
    },
  }),

  /**
   * Tenant integrations status
   */
  integrations: defineResource({
    uri: 'cgk://integrations/status',
    name: 'Integrations Status',
    description: 'Status of configured integrations for the current tenant',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      const { withTenant, sql } = await import('@cgk-platform/db')

      // Check various integration configurations
      const integrations = await withTenant(tenantId, async () => {
        const results: Record<string, { configured: boolean; lastSync?: string }> = {}

        // Check Stripe
        const stripe = await sql`
          SELECT id, updated_at FROM tenant_stripe_config LIMIT 1
        `
        results.stripe = {
          configured: stripe.rows.length > 0,
          lastSync: stripe.rows[0]?.updated_at as string | undefined,
        }

        // Check Resend
        const resend = await sql`
          SELECT id, updated_at FROM tenant_resend_config LIMIT 1
        `
        results.resend = {
          configured: resend.rows.length > 0,
          lastSync: resend.rows[0]?.updated_at as string | undefined,
        }

        // Check Shopify
        const shopify = await sql`
          SELECT id, updated_at FROM shopify_stores LIMIT 1
        `
        results.shopify = {
          configured: shopify.rows.length > 0,
          lastSync: shopify.rows[0]?.updated_at as string | undefined,
        }

        // Check Slack
        const slack = await sql`
          SELECT id, updated_at FROM tenant_slack_workspaces LIMIT 1
        `
        results.slack = {
          configured: slack.rows.length > 0,
          lastSync: slack.rows[0]?.updated_at as string | undefined,
        }

        return results
      })

      return {
        uri: 'cgk://integrations/status',
        mimeType: 'application/json',
        text: JSON.stringify(integrations, null, 2),
      }
    },
  }),

  /**
   * Recent orders summary
   */
  recentOrders: defineResource({
    uri: 'cgk://commerce/orders/recent',
    name: 'Recent Orders',
    description: 'Summary of the 10 most recent orders',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      const { withTenant, sql } = await import('@cgk-platform/db')

      const orders = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            id,
            order_number,
            status,
            total_price,
            currency,
            customer_email,
            created_at
          FROM orders
          ORDER BY created_at DESC
          LIMIT 10
        `
        return result.rows
      })

      return {
        uri: 'cgk://commerce/orders/recent',
        mimeType: 'application/json',
        text: JSON.stringify({
          count: orders.length,
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            total: o.total_price,
            currency: o.currency,
            customerEmail: o.customer_email,
            createdAt: o.created_at,
          })),
        }, null, 2),
      }
    },
  }),

  /**
   * Active creators summary
   */
  activeCreators: defineResource({
    uri: 'cgk://creators/active',
    name: 'Active Creators',
    description: 'Summary of active creators in the tenant',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      const { withTenant, sql } = await import('@cgk-platform/db')

      const data = await withTenant(tenantId, async () => {
        // Get creator stats
        const stats = await sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive
          FROM creators
        `

        // Get recent creators
        const recent = await sql`
          SELECT
            id,
            name,
            email,
            status,
            created_at
          FROM creators
          ORDER BY created_at DESC
          LIMIT 5
        `

        return {
          stats: stats.rows[0] || { total: 0, active: 0, pending: 0, inactive: 0 },
          recent: recent.rows,
        }
      })

      return {
        uri: 'cgk://creators/active',
        mimeType: 'application/json',
        text: JSON.stringify({
          totalCreators: Number(data.stats.total) || 0,
          activeCreators: Number(data.stats.active) || 0,
          pendingCreators: Number(data.stats.pending) || 0,
          inactiveCreators: Number(data.stats.inactive) || 0,
          recentCreators: data.recent.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            status: c.status,
            createdAt: c.created_at,
          })),
        }, null, 2),
      }
    },
  }),

  /**
   * Analytics summary for current period
   */
  analyticsSummary: defineResource({
    uri: 'cgk://analytics/summary',
    name: 'Analytics Summary',
    description: 'High-level analytics summary for the past 30 days',
    mimeType: 'application/json',
    async handler(context) {
      const { tenantId } = context

      const { withTenant, sql } = await import('@cgk-platform/db')

      const summary = await withTenant(tenantId, async () => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Get order metrics
        const orderMetrics = await sql`
          SELECT
            COUNT(*) as order_count,
            COALESCE(SUM(total_price), 0) as revenue,
            COALESCE(AVG(total_price), 0) as aov
          FROM orders
          WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        `

        // Get customer metrics
        const customerMetrics = await sql`
          SELECT
            COUNT(*) as total_customers,
            COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo.toISOString()}) as new_customers
          FROM customers
        `

        // Get review metrics
        const reviewMetrics = await sql`
          SELECT
            COUNT(*) as total_reviews,
            COALESCE(AVG(rating), 0) as avg_rating
          FROM reviews
          WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        `

        return {
          orders: orderMetrics.rows[0] || { order_count: 0, revenue: 0, aov: 0 },
          customers: customerMetrics.rows[0] || { total_customers: 0, new_customers: 0 },
          reviews: reviewMetrics.rows[0] || { total_reviews: 0, avg_rating: 0 },
        }
      })

      return {
        uri: 'cgk://analytics/summary',
        mimeType: 'application/json',
        text: JSON.stringify({
          period: 'last_30_days',
          orders: {
            count: Number(summary.orders.order_count) || 0,
            revenue: Number(summary.orders.revenue) || 0,
            averageOrderValue: Number(summary.orders.aov) || 0,
          },
          customers: {
            total: Number(summary.customers.total_customers) || 0,
            newThisPeriod: Number(summary.customers.new_customers) || 0,
          },
          reviews: {
            count: Number(summary.reviews.total_reviews) || 0,
            averageRating: Number(summary.reviews.avg_rating) || 0,
          },
        }, null, 2),
      }
    },
  }),
}

// Legacy alias for backward compatibility
export const exampleResources = platformResources
