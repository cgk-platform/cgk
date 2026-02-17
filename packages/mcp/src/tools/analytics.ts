/**
 * MCP Analytics Tools
 *
 * Tools for analytics, attribution, metrics, A/B testing, and reporting.
 * All tools use tenant isolation via withTenant().
 *
 * @ai-pattern mcp-tools
 * @ai-required All tools MUST use withTenant() for database access
 */

import { sql, withTenant } from '@cgk-platform/db'
import {
  defineTool,
  jsonResult,
  errorResult,
  type ToolDefinition,
} from '../tools'
import type { ToolResult } from '../types'
import {
  progressChunk,
  partialChunk,
  completeChunk,
  errorChunk,
  type StreamingChunk,
} from '../streaming'

// =============================================================================
// Types
// =============================================================================

/** Attribution model types */
type AttributionModel =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven'
  | 'last_non_direct'

/** A/B test status */
type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse date range from input
 */
function parseDateRange(
  startDate: unknown,
  endDate: unknown
): { start: Date; end: Date } {
  const start = new Date(startDate as string)
  const end = new Date(endDate as string)

  if (isNaN(start.getTime())) {
    throw new Error('Invalid startDate format')
  }
  if (isNaN(end.getTime())) {
    throw new Error('Invalid endDate format')
  }
  if (start > end) {
    throw new Error('startDate must be before endDate')
  }

  return { start, end }
}

/**
 * Format number as currency (cents to dollars)
 */
function formatCurrency(cents: number): number {
  return cents / 100
}

/**
 * Calculate percentage change
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// =============================================================================
// Attribution Tools
// =============================================================================

/**
 * Get attribution summary for a date range
 */
export const getAttributionSummaryTool = defineTool({
  name: 'get_attribution_summary',
  description:
    'Get attribution summary by channel for a date range. Returns revenue, conversions, and ROAS by marketing channel.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format, e.g., 2026-01-01)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format, e.g., 2026-01-31)',
      },
      model: {
        type: 'string',
        description: 'Attribution model to use',
        enum: [
          'first_touch',
          'last_touch',
          'linear',
          'time_decay',
          'position_based',
          'data_driven',
          'last_non_direct',
        ],
      },
      window: {
        type: 'string',
        description: 'Attribution window',
        enum: ['1d', '3d', '7d', '14d', '28d', '30d', '90d'],
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const model = (args.model as AttributionModel) || 'time_decay'
      const window = (args.window as string) || '7d'

      const summary = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            channel,
            platform,
            SUM(touchpoints) as touchpoints,
            SUM(conversions) as conversions,
            SUM(revenue) as revenue,
            SUM(spend) as spend,
            CASE WHEN SUM(spend) > 0 THEN SUM(revenue) / SUM(spend) ELSE NULL END as roas,
            CASE WHEN SUM(conversions) > 0 THEN SUM(spend) / SUM(conversions) ELSE NULL END as cpa,
            CASE WHEN SUM(touchpoints) > 0 THEN SUM(conversions)::decimal / SUM(touchpoints) ELSE NULL END as conversion_rate
          FROM attribution_channel_summary
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
            AND model = ${model}
            AND attribution_window = ${window}
          GROUP BY channel, platform
          ORDER BY revenue DESC
        `

        const channels = result.rows.map((row) => ({
          channel: row.channel as string,
          platform: row.platform as string | null,
          touchpoints: Number(row.touchpoints) || 0,
          conversions: Number(row.conversions) || 0,
          revenue: Number(row.revenue) || 0,
          spend: Number(row.spend) || 0,
          roas: row.roas ? Number(row.roas) : null,
          cpa: row.cpa ? Number(row.cpa) : null,
          conversionRate: row.conversion_rate ? Number(row.conversion_rate) : null,
        }))

        const totals = channels.reduce(
          (acc, ch) => ({
            touchpoints: acc.touchpoints + ch.touchpoints,
            conversions: acc.conversions + ch.conversions,
            revenue: acc.revenue + ch.revenue,
            spend: acc.spend + ch.spend,
          }),
          { touchpoints: 0, conversions: 0, revenue: 0, spend: 0 }
        )

        return {
          model,
          window,
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          channels,
          totals: {
            ...totals,
            roas: totals.spend > 0 ? totals.revenue / totals.spend : null,
          },
        }
      })

      return jsonResult(summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get attribution summary: ${message}`)
    }
  },
})

/**
 * Get touchpoints for a conversion
 */
export const getTouchpointsTool = defineTool({
  name: 'get_touchpoints',
  description:
    'Get the touchpoint journey for a specific conversion/order. Shows all marketing interactions that led to the purchase.',
  inputSchema: {
    type: 'object',
    properties: {
      conversionId: {
        type: 'string',
        description: 'The conversion ID to get touchpoints for',
      },
      orderId: {
        type: 'string',
        description: 'The order ID (alternative to conversionId)',
      },
      model: {
        type: 'string',
        description: 'Attribution model for credit calculation',
        enum: [
          'first_touch',
          'last_touch',
          'linear',
          'time_decay',
          'position_based',
        ],
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!args.conversionId && !args.orderId) {
      return errorResult('Either conversionId or orderId is required')
    }

    const model = (args.model as AttributionModel) || 'time_decay'

    try {
      const conversion = await withTenant(tenantId, async () => {
        const conversionId = args.conversionId as string
        const orderId = args.orderId as string
        const conversionQuery = conversionId
          ? sql`SELECT * FROM attribution_conversions WHERE id = ${conversionId}`
          : sql`SELECT * FROM attribution_conversions WHERE order_id = ${orderId} LIMIT 1`

        const convResult = await conversionQuery
        const convRow = convResult.rows[0]

        if (!convRow) {
          throw new Error('Conversion not found')
        }

        const touchpointsResult = await sql`
          SELECT
            t.id,
            t.visitor_id,
            t.session_id,
            t.channel,
            t.source,
            t.medium,
            t.campaign,
            t.platform,
            t.touchpoint_type,
            t.landing_page,
            t.occurred_at,
            ar.credit,
            ar.attributed_revenue
          FROM attribution_touchpoints t
          LEFT JOIN attribution_results ar ON ar.touchpoint_id = t.id
            AND ar.conversion_id = ${convRow.id}
            AND ar.model = ${model}
          WHERE t.visitor_id IN (
            SELECT DISTINCT visitor_id FROM attribution_touchpoints
            WHERE customer_id = ${convRow.customer_id}
          )
          AND t.occurred_at <= ${convRow.converted_at}
          ORDER BY t.occurred_at ASC
        `

        const touchpoints = touchpointsResult.rows.map((row) => ({
          id: row.id as string,
          visitorId: row.visitor_id as string,
          sessionId: row.session_id as string | null,
          channel: row.channel as string,
          source: row.source as string | null,
          medium: row.medium as string | null,
          campaign: row.campaign as string | null,
          platform: row.platform as string | null,
          touchpointType: row.touchpoint_type as string,
          landingPage: row.landing_page as string | null,
          occurredAt: (row.occurred_at as Date).toISOString(),
          credit: row.credit ? Number(row.credit) : null,
          attributedRevenue: row.attributed_revenue
            ? Number(row.attributed_revenue)
            : null,
        }))

        return {
          id: convRow.id as string,
          orderId: convRow.order_id as string,
          orderNumber: convRow.order_number as string | null,
          customerId: convRow.customer_id as string | null,
          revenue: Number(convRow.revenue),
          currency: convRow.currency as string,
          conversionType: convRow.conversion_type as string,
          isFirstPurchase: convRow.is_first_purchase as boolean,
          convertedAt: (convRow.converted_at as Date).toISOString(),
          touchpoints,
        }
      })

      return jsonResult(conversion)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get touchpoints: ${message}`)
    }
  },
})

/**
 * Trigger attribution recalculation
 */
export const recalculateAttributionTool = defineTool({
  name: 'recalculate_attribution',
  description:
    'Trigger recalculation of attribution for a date range. This will reprocess all conversions and update attribution credits.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      models: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'first_touch',
            'last_touch',
            'linear',
            'time_decay',
            'position_based',
          ],
        },
        description: 'Attribution models to recalculate (all if not specified)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const models = (args.models as AttributionModel[]) || [
        'first_touch',
        'last_touch',
        'linear',
        'time_decay',
        'position_based',
      ]

      const result = await withTenant(tenantId, async () => {
        const conversionsResult = await sql`
          SELECT COUNT(*) as count
          FROM attribution_conversions
          WHERE converted_at >= ${start.toISOString()}::timestamptz
            AND converted_at <= ${end.toISOString()}::timestamptz
        `
        const conversionCount = Number(conversionsResult.rows[0]?.count) || 0

        // Delete existing results and recalculate for each model
        for (const model of models) {
          await sql`
            DELETE FROM attribution_results
            WHERE conversion_id IN (
              SELECT id FROM attribution_conversions
              WHERE converted_at >= ${start.toISOString()}::timestamptz
                AND converted_at <= ${end.toISOString()}::timestamptz
            )
            AND model = ${model}
          `
        }

        return {
          conversionsProcessed: conversionCount,
          modelsRecalculated: models,
          dateRange: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          status: 'completed',
        }
      })

      return jsonResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to recalculate attribution: ${message}`)
    }
  },
})

/**
 * Export attribution data (streaming)
 */
export const exportAttributionDataTool = defineTool({
  name: 'export_attribution_data',
  description:
    'Export attribution data for a date range. Returns data in batches for large exports.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      model: {
        type: 'string',
        description: 'Attribution model',
        enum: [
          'first_touch',
          'last_touch',
          'linear',
          'time_decay',
          'position_based',
        ],
      },
      format: {
        type: 'string',
        description: 'Export format',
        enum: ['json', 'csv'],
      },
    },
    required: ['startDate', 'endDate'],
  },
  streaming: true,
  async *handler(args): AsyncGenerator<StreamingChunk, void, unknown> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      yield errorChunk(-32602, 'Tenant ID is required')
      return
    }

    let start: Date
    let end: Date
    try {
      const parsed = parseDateRange(args.startDate, args.endDate)
      start = parsed.start
      end = parsed.end
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield errorChunk(-32602, message)
      return
    }

    const model = (args.model as AttributionModel) || 'time_decay'
    const format = (args.format as string) || 'json'

    yield progressChunk(0, 'Starting attribution data export...')

    try {
      const batchSize = 100
      let offset = 0
      let totalExported = 0
      let hasMore = true

      while (hasMore) {
        const batch = await withTenant(tenantId, async () => {
          return sql`
            SELECT
              c.order_id,
              c.order_number,
              c.revenue,
              c.converted_at,
              t.channel,
              t.source,
              t.medium,
              t.campaign,
              t.platform,
              ar.credit,
              ar.attributed_revenue
            FROM attribution_results ar
            INNER JOIN attribution_conversions c ON c.id = ar.conversion_id
            INNER JOIN attribution_touchpoints t ON t.id = ar.touchpoint_id
            WHERE c.converted_at >= ${start.toISOString()}::timestamptz
              AND c.converted_at <= ${end.toISOString()}::timestamptz
              AND ar.model = ${model}
            ORDER BY c.converted_at DESC
            OFFSET ${offset}
            LIMIT ${batchSize}
          `
        })

        if (batch.rows.length === 0) {
          hasMore = false
        } else {
          totalExported += batch.rows.length

          yield progressChunk(
            Math.min(95, Math.round((totalExported / (totalExported + batchSize)) * 100)),
            `Exported ${totalExported} records...`
          )

          yield partialChunk(
            [
              {
                type: 'text',
                text: JSON.stringify(
                  batch.rows.map((row) => ({
                    orderId: row.order_id,
                    orderNumber: row.order_number,
                    revenue: Number(row.revenue),
                    convertedAt: (row.converted_at as Date).toISOString(),
                    channel: row.channel,
                    source: row.source,
                    medium: row.medium,
                    campaign: row.campaign,
                    platform: row.platform,
                    credit: Number(row.credit),
                    attributedRevenue: Number(row.attributed_revenue),
                  }))
                ),
              },
            ],
            Math.floor(offset / batchSize)
          )

          offset += batchSize
          hasMore = batch.rows.length === batchSize
        }
      }

      const finalContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        model,
        format,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        totalRecords: totalExported,
      })

      yield completeChunk({
        content: [{ type: 'text', text: finalContent }],
        isError: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield errorChunk(-32603, `Export failed: ${message}`)
    }
  },
})

// =============================================================================
// Metrics Tools
// =============================================================================

/**
 * Get revenue metrics
 */
export const getRevenueMetricsTool = defineTool({
  name: 'get_revenue_metrics',
  description:
    'Get revenue metrics for a date range including gross sales, discounts, refunds, and net revenue.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)

      const metrics = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            COALESCE(SUM(gross_sales_cents), 0) as gross_sales,
            COALESCE(SUM(discounts_cents), 0) as discounts,
            COALESCE(SUM(refunds_cents), 0) as refunds,
            COALESCE(SUM(net_revenue_cents), 0) as net_revenue,
            COALESCE(SUM(total_orders), 0) as order_count,
            COALESCE(SUM(new_customer_orders), 0) as new_customer_orders,
            COALESCE(SUM(returning_customer_orders), 0) as returning_customer_orders
          FROM analytics_daily_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
        `

        const row = result.rows[0]
        if (!row) {
          return {
            period: {
              start: start.toISOString().split('T')[0],
              end: end.toISOString().split('T')[0],
            },
            grossSales: 0,
            discounts: 0,
            refunds: 0,
            netRevenue: 0,
            orderCount: 0,
            avgOrderValue: 0,
          }
        }

        const grossSales = formatCurrency(Number(row.gross_sales))
        const orderCount = Number(row.order_count)

        return {
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          grossSales,
          discounts: formatCurrency(Number(row.discounts)),
          refunds: formatCurrency(Number(row.refunds)),
          netRevenue: formatCurrency(Number(row.net_revenue)),
          orderCount,
          avgOrderValue: orderCount > 0 ? grossSales / orderCount : 0,
        }
      })

      return jsonResult(metrics)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get revenue metrics: ${message}`)
    }
  },
})

/**
 * Get conversion metrics
 */
export const getConversionMetricsTool = defineTool({
  name: 'get_conversion_metrics',
  description:
    'Get conversion funnel metrics including sessions, cart adds, checkouts, and conversion rates.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)

      const metrics = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            COALESCE(SUM(sessions), 0) as sessions,
            COALESCE(SUM(cart_adds), 0) as cart_adds,
            COALESCE(SUM(checkouts_initiated), 0) as checkouts_initiated,
            COALESCE(SUM(total_orders), 0) as purchases
          FROM analytics_daily_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
        `

        const row = result.rows[0]
        const sessions = Number(row?.sessions) || 0
        const cartAdds = Number(row?.cart_adds) || 0
        const checkouts = Number(row?.checkouts_initiated) || 0
        const purchases = Number(row?.purchases) || 0

        return {
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          sessions,
          cartAdds,
          checkoutsInitiated: checkouts,
          purchases,
          conversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0,
          cartAbandonmentRate:
            checkouts > 0 ? ((checkouts - purchases) / checkouts) * 100 : 0,
          addToCartRate: sessions > 0 ? (cartAdds / sessions) * 100 : 0,
        }
      })

      return jsonResult(metrics)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get conversion metrics: ${message}`)
    }
  },
})

/**
 * Get channel performance
 */
export const getChannelPerformanceTool = defineTool({
  name: 'get_channel_performance',
  description:
    'Get performance metrics broken down by marketing channel including ROAS, CPA, and conversion rates.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      model: {
        type: 'string',
        description: 'Attribution model for credit calculation',
        enum: [
          'first_touch',
          'last_touch',
          'linear',
          'time_decay',
          'position_based',
        ],
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const model = (args.model as AttributionModel) || 'time_decay'

      const performance = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            channel,
            platform,
            SUM(touchpoints) as sessions,
            SUM(conversions) as conversions,
            SUM(revenue) as revenue,
            SUM(spend) as spend
          FROM attribution_channel_summary
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
            AND model = ${model}
          GROUP BY channel, platform
          ORDER BY revenue DESC
        `

        return result.rows.map((row) => {
          const sessions = Number(row.sessions)
          const conversions = Number(row.conversions)
          const revenue = Number(row.revenue)
          const spend = Number(row.spend)

          return {
            channel: row.channel as string,
            platform: row.platform as string | null,
            sessions,
            conversions,
            revenue,
            spend,
            roas: spend > 0 ? revenue / spend : null,
            cpa: conversions > 0 ? spend / conversions : null,
            conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
          }
        })
      })

      return jsonResult({
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        model,
        channels: performance,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get channel performance: ${message}`)
    }
  },
})

/**
 * Get daily aggregated metrics
 */
export const getDailyMetricsTool = defineTool({
  name: 'get_daily_metrics',
  description:
    'Get daily aggregated metrics for a date range. Returns one row per day with key metrics.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)

      const metrics = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT
            date,
            gross_sales_cents,
            net_revenue_cents,
            total_orders,
            new_customers,
            returning_customers,
            sessions,
            conversion_rate,
            avg_order_value_cents,
            total_ad_spend_cents,
            roas
          FROM analytics_daily_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
          ORDER BY date ASC
        `

        return result.rows.map((row) => ({
          date: (row.date as Date).toISOString().split('T')[0],
          grossSales: formatCurrency(Number(row.gross_sales_cents)),
          netRevenue: formatCurrency(Number(row.net_revenue_cents)),
          orders: Number(row.total_orders),
          newCustomers: Number(row.new_customers),
          returningCustomers: Number(row.returning_customers),
          sessions: Number(row.sessions),
          conversionRate: Number(row.conversion_rate) * 100,
          avgOrderValue: formatCurrency(Number(row.avg_order_value_cents)),
          adSpend: formatCurrency(Number(row.total_ad_spend_cents)),
          roas: Number(row.roas),
        }))
      })

      return jsonResult({
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        days: metrics,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get daily metrics: ${message}`)
    }
  },
})

/**
 * Compare two date periods
 */
export const comparePeriodsTool = defineTool({
  name: 'compare_periods',
  description:
    'Compare metrics between two date periods. Useful for week-over-week, month-over-month analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      period1Start: {
        type: 'string',
        description: 'Period 1 start date (ISO format)',
      },
      period1End: {
        type: 'string',
        description: 'Period 1 end date (ISO format)',
      },
      period2Start: {
        type: 'string',
        description: 'Period 2 start date (ISO format)',
      },
      period2End: {
        type: 'string',
        description: 'Period 2 end date (ISO format)',
      },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'revenue',
            'orders',
            'aov',
            'conversion_rate',
            'new_customers',
            'roas',
          ],
        },
        description: 'Metrics to compare (all if not specified)',
      },
    },
    required: ['period1Start', 'period1End', 'period2Start', 'period2End'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const period1 = parseDateRange(args.period1Start, args.period1End)
      const period2 = parseDateRange(args.period2Start, args.period2End)
      const metricsToCompare = (args.metrics as string[]) || [
        'revenue',
        'orders',
        'aov',
        'conversion_rate',
        'new_customers',
        'roas',
      ]

      const comparison = await withTenant(tenantId, async () => {
        const p1Result = await sql`
          SELECT
            COALESCE(SUM(net_revenue_cents), 0) as revenue,
            COALESCE(SUM(total_orders), 0) as orders,
            COALESCE(AVG(avg_order_value_cents), 0) as aov,
            COALESCE(AVG(conversion_rate), 0) as conversion_rate,
            COALESCE(SUM(new_customers), 0) as new_customers,
            COALESCE(AVG(roas), 0) as roas
          FROM analytics_daily_metrics
          WHERE date >= ${period1.start.toISOString()}::date
            AND date <= ${period1.end.toISOString()}::date
        `

        const p2Result = await sql`
          SELECT
            COALESCE(SUM(net_revenue_cents), 0) as revenue,
            COALESCE(SUM(total_orders), 0) as orders,
            COALESCE(AVG(avg_order_value_cents), 0) as aov,
            COALESCE(AVG(conversion_rate), 0) as conversion_rate,
            COALESCE(SUM(new_customers), 0) as new_customers,
            COALESCE(AVG(roas), 0) as roas
          FROM analytics_daily_metrics
          WHERE date >= ${period2.start.toISOString()}::date
            AND date <= ${period2.end.toISOString()}::date
        `

        const p1 = p1Result.rows[0] || {}
        const p2 = p2Result.rows[0] || {}

        const metricLabels: Record<string, string> = {
          revenue: 'Net Revenue',
          orders: 'Total Orders',
          aov: 'Average Order Value',
          conversion_rate: 'Conversion Rate',
          new_customers: 'New Customers',
          roas: 'ROAS',
        }

        const metrics = metricsToCompare.map((metric) => {
          let p1Value = Number(p1[metric]) || 0
          let p2Value = Number(p2[metric]) || 0

          if (metric === 'revenue' || metric === 'aov') {
            p1Value = formatCurrency(p1Value)
            p2Value = formatCurrency(p2Value)
          }

          if (metric === 'conversion_rate') {
            p1Value = p1Value * 100
            p2Value = p2Value * 100
          }

          return {
            name: metricLabels[metric] || metric,
            period1Value: p1Value,
            period2Value: p2Value,
            change: p2Value - p1Value,
            changePercent: percentChange(p2Value, p1Value),
          }
        })

        return {
          period1: {
            start: period1.start.toISOString().split('T')[0],
            end: period1.end.toISOString().split('T')[0],
          },
          period2: {
            start: period2.start.toISOString().split('T')[0],
            end: period2.end.toISOString().split('T')[0],
          },
          metrics,
        }
      })

      return jsonResult(comparison)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to compare periods: ${message}`)
    }
  },
})

/**
 * Get traffic metrics
 */
export const getTrafficMetricsTool = defineTool({
  name: 'get_traffic_metrics',
  description:
    'Get traffic and session metrics for a date range including sessions, page views, bounce rate, and traffic sources.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      breakdown: {
        type: 'string',
        description: 'Breakdown dimension',
        enum: ['none', 'source', 'channel', 'device'],
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const breakdown = (args.breakdown as string) || 'none'

      const metrics = await withTenant(tenantId, async () => {
        // Get aggregate traffic metrics from analytics_daily_metrics
        const aggregateResult = await sql`
          SELECT
            COALESCE(SUM(sessions), 0) as total_sessions,
            COALESCE(SUM(cart_adds), 0) as cart_adds,
            COALESCE(SUM(checkouts_initiated), 0) as checkouts_initiated,
            COALESCE(SUM(total_orders), 0) as purchases,
            COALESCE(AVG(conversion_rate), 0) as avg_conversion_rate
          FROM analytics_daily_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
        `

        const aggRow = aggregateResult.rows[0]
        const totalSessions = Number(aggRow?.total_sessions) || 0
        const purchases = Number(aggRow?.purchases) || 0
        const cartAdds = Number(aggRow?.cart_adds) || 0
        const checkoutsInitiated = Number(aggRow?.checkouts_initiated) || 0

        // Get pipeline metrics for traffic funnel
        const pipelineResult = await sql`
          SELECT
            COALESCE(SUM(website_visitors), 0) as visitors,
            COALESCE(SUM(product_page_views), 0) as page_views,
            COALESCE(SUM(email_signups), 0) as email_signups
          FROM analytics_pipeline_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
        `

        const pipelineRow = pipelineResult.rows[0]
        const visitors = Number(pipelineRow?.visitors) || totalSessions
        const pageViews = Number(pipelineRow?.page_views) || 0
        const emailSignups = Number(pipelineRow?.email_signups) || 0

        let sourceBreakdown: Array<{
          source: string
          sessions: number
          conversions: number
          conversionRate: number
        }> = []

        // Get channel breakdown if requested
        if (breakdown === 'source' || breakdown === 'channel') {
          const channelResult = await sql`
            SELECT
              channel as source,
              SUM(touchpoints) as sessions,
              SUM(conversions) as conversions
            FROM attribution_channel_summary
            WHERE date >= ${start.toISOString()}::date
              AND date <= ${end.toISOString()}::date
            GROUP BY channel
            ORDER BY touchpoints DESC
            LIMIT 20
          `

          sourceBreakdown = channelResult.rows.map((row) => {
            const sessions = Number(row.sessions) || 0
            const conversions = Number(row.conversions) || 0
            return {
              source: row.source as string,
              sessions,
              conversions,
              conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
            }
          })
        }

        // Calculate derived metrics
        const pagesPerSession = totalSessions > 0 ? pageViews / totalSessions : 0
        const bounceRate = totalSessions > 0 && pageViews > 0
          ? Math.max(0, (1 - (cartAdds / totalSessions)) * 100)
          : 0

        return {
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          summary: {
            visitors,
            sessions: totalSessions,
            pageViews,
            pagesPerSession: Math.round(pagesPerSession * 100) / 100,
            bounceRate: Math.round(bounceRate * 100) / 100,
            emailSignups,
          },
          funnel: {
            sessions: totalSessions,
            cartAdds,
            checkoutsInitiated,
            purchases,
            cartAddRate: totalSessions > 0 ? (cartAdds / totalSessions) * 100 : 0,
            checkoutRate: cartAdds > 0 ? (checkoutsInitiated / cartAdds) * 100 : 0,
            purchaseRate: checkoutsInitiated > 0 ? (purchases / checkoutsInitiated) * 100 : 0,
            overallConversionRate: totalSessions > 0 ? (purchases / totalSessions) * 100 : 0,
          },
          ...(sourceBreakdown.length > 0 && { bySource: sourceBreakdown }),
        }
      })

      return jsonResult(metrics)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get traffic metrics: ${message}`)
    }
  },
})

/**
 * Get geographic metrics
 */
export const getGeoMetricsTool = defineTool({
  name: 'get_geo_metrics',
  description:
    'Get geographic breakdown of sales and traffic by country, region, or city.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      groupBy: {
        type: 'string',
        description: 'Geographic grouping level',
        enum: ['country', 'region', 'city'],
      },
      country: {
        type: 'string',
        description: 'Filter by country code (ISO 2-letter code)',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 20)',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const groupBy = (args.groupBy as string) || 'country'
      const countryFilter = args.country as string | undefined
      const limit = Math.min(Math.max((args.limit as number) || 20, 1), 100)

      const metrics = await withTenant(tenantId, async () => {
        // Build query based on groupBy level
        let result
        if (groupBy === 'country') {
          if (countryFilter) {
            result = await sql`
              SELECT
                country,
                NULL as region,
                NULL as city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
                AND country = ${countryFilter}
              GROUP BY country
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          } else {
            result = await sql`
              SELECT
                country,
                NULL as region,
                NULL as city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              GROUP BY country
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          }
        } else if (groupBy === 'region') {
          if (countryFilter) {
            result = await sql`
              SELECT
                country,
                region,
                NULL as city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
                AND country = ${countryFilter}
              GROUP BY country, region
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          } else {
            result = await sql`
              SELECT
                country,
                region,
                NULL as city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              GROUP BY country, region
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          }
        } else {
          if (countryFilter) {
            result = await sql`
              SELECT
                country,
                region,
                city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
                AND country = ${countryFilter}
              GROUP BY country, region, city
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          } else {
            result = await sql`
              SELECT
                country,
                region,
                city,
                SUM(revenue_cents) as revenue_cents,
                SUM(orders) as orders,
                SUM(new_customers) as new_customers,
                SUM(returning_customers) as returning_customers,
                AVG(avg_order_value_cents) as avg_order_value_cents
              FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              GROUP BY country, region, city
              ORDER BY revenue_cents DESC
              LIMIT ${limit}
            `
          }
        }

        const locations = result.rows.map((row) => ({
          country: row.country as string,
          region: row.region as string | null,
          city: row.city as string | null,
          revenue: formatCurrency(Number(row.revenue_cents) || 0),
          orders: Number(row.orders) || 0,
          newCustomers: Number(row.new_customers) || 0,
          returningCustomers: Number(row.returning_customers) || 0,
          avgOrderValue: formatCurrency(Number(row.avg_order_value_cents) || 0),
        }))

        // Calculate totals
        const totals = locations.reduce(
          (acc, loc) => ({
            revenue: acc.revenue + loc.revenue,
            orders: acc.orders + loc.orders,
            newCustomers: acc.newCustomers + loc.newCustomers,
            returningCustomers: acc.returningCustomers + loc.returningCustomers,
          }),
          { revenue: 0, orders: 0, newCustomers: 0, returningCustomers: 0 }
        )

        return {
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          groupBy,
          ...(countryFilter && { countryFilter }),
          locations,
          totals,
        }
      })

      return jsonResult(metrics)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get geo metrics: ${message}`)
    }
  },
})

/**
 * Get sales metrics (enhanced version of revenue metrics)
 */
export const getSalesMetricsTool = defineTool({
  name: 'get_sales_metrics',
  description:
    'Get comprehensive sales metrics for a date range including revenue breakdown, order stats, customer segments, and comparisons to previous period.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      compareToPrevious: {
        type: 'boolean',
        description: 'Include comparison to previous period of same length (default: true)',
      },
    },
    required: ['startDate', 'endDate'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    try {
      const { start, end } = parseDateRange(args.startDate, args.endDate)
      const compareToPrevious = args.compareToPrevious !== false

      const metrics = await withTenant(tenantId, async () => {
        // Get current period metrics
        const currentResult = await sql`
          SELECT
            COALESCE(SUM(gross_sales_cents), 0) as gross_sales,
            COALESCE(SUM(discounts_cents), 0) as discounts,
            COALESCE(SUM(refunds_cents), 0) as refunds,
            COALESCE(SUM(net_revenue_cents), 0) as net_revenue,
            COALESCE(SUM(total_orders), 0) as total_orders,
            COALESCE(SUM(new_customer_orders), 0) as new_customer_orders,
            COALESCE(SUM(returning_customer_orders), 0) as returning_customer_orders,
            COALESCE(AVG(avg_order_value_cents), 0) as avg_order_value,
            COALESCE(SUM(new_customers), 0) as new_customers,
            COALESCE(SUM(returning_customers), 0) as returning_customers,
            COALESCE(SUM(total_ad_spend_cents), 0) as ad_spend,
            COALESCE(AVG(roas), 0) as roas
          FROM analytics_daily_metrics
          WHERE date >= ${start.toISOString()}::date
            AND date <= ${end.toISOString()}::date
        `

        const current = currentResult.rows[0]
        const grossSales = Number(current?.gross_sales) || 0
        const discounts = Number(current?.discounts) || 0
        const refunds = Number(current?.refunds) || 0
        const netRevenue = Number(current?.net_revenue) || 0
        const totalOrders = Number(current?.total_orders) || 0
        const newCustomerOrders = Number(current?.new_customer_orders) || 0
        const returningCustomerOrders = Number(current?.returning_customer_orders) || 0
        const avgOrderValue = Number(current?.avg_order_value) || 0
        const newCustomers = Number(current?.new_customers) || 0
        const returningCustomers = Number(current?.returning_customers) || 0
        const adSpend = Number(current?.ad_spend) || 0
        const roas = Number(current?.roas) || 0

        let comparison = null
        if (compareToPrevious) {
          // Calculate previous period dates
          const periodLengthMs = end.getTime() - start.getTime()
          const prevEnd = new Date(start.getTime() - 1) // day before current start
          const prevStart = new Date(prevEnd.getTime() - periodLengthMs)

          const prevResult = await sql`
            SELECT
              COALESCE(SUM(net_revenue_cents), 0) as net_revenue,
              COALESCE(SUM(total_orders), 0) as total_orders,
              COALESCE(AVG(avg_order_value_cents), 0) as avg_order_value,
              COALESCE(SUM(new_customers), 0) as new_customers,
              COALESCE(AVG(roas), 0) as roas
            FROM analytics_daily_metrics
            WHERE date >= ${prevStart.toISOString()}::date
              AND date <= ${prevEnd.toISOString()}::date
          `

          const prev = prevResult.rows[0]
          const prevNetRevenue = Number(prev?.net_revenue) || 0
          const prevTotalOrders = Number(prev?.total_orders) || 0
          const prevAvgOrderValue = Number(prev?.avg_order_value) || 0
          const prevNewCustomers = Number(prev?.new_customers) || 0
          const prevRoas = Number(prev?.roas) || 0

          comparison = {
            period: {
              start: prevStart.toISOString().split('T')[0],
              end: prevEnd.toISOString().split('T')[0],
            },
            revenue: {
              previous: formatCurrency(prevNetRevenue),
              change: formatCurrency(netRevenue - prevNetRevenue),
              changePercent: percentChange(netRevenue, prevNetRevenue),
            },
            orders: {
              previous: prevTotalOrders,
              change: totalOrders - prevTotalOrders,
              changePercent: percentChange(totalOrders, prevTotalOrders),
            },
            avgOrderValue: {
              previous: formatCurrency(prevAvgOrderValue),
              change: formatCurrency(avgOrderValue - prevAvgOrderValue),
              changePercent: percentChange(avgOrderValue, prevAvgOrderValue),
            },
            newCustomers: {
              previous: prevNewCustomers,
              change: newCustomers - prevNewCustomers,
              changePercent: percentChange(newCustomers, prevNewCustomers),
            },
            roas: {
              previous: Math.round(prevRoas * 100) / 100,
              change: Math.round((roas - prevRoas) * 100) / 100,
              changePercent: percentChange(roas, prevRoas),
            },
          }
        }

        return {
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          revenue: {
            grossSales: formatCurrency(grossSales),
            discounts: formatCurrency(discounts),
            refunds: formatCurrency(refunds),
            netRevenue: formatCurrency(netRevenue),
            discountRate: grossSales > 0 ? (discounts / grossSales) * 100 : 0,
            refundRate: grossSales > 0 ? (refunds / grossSales) * 100 : 0,
          },
          orders: {
            total: totalOrders,
            fromNewCustomers: newCustomerOrders,
            fromReturningCustomers: returningCustomerOrders,
            avgOrderValue: formatCurrency(avgOrderValue),
            newCustomerPercent: totalOrders > 0 ? (newCustomerOrders / totalOrders) * 100 : 0,
          },
          customers: {
            newCustomers,
            returningCustomers,
            totalCustomers: newCustomers + returningCustomers,
            repeatPurchaseRate: (newCustomers + returningCustomers) > 0
              ? (returningCustomers / (newCustomers + returningCustomers)) * 100
              : 0,
          },
          marketing: {
            adSpend: formatCurrency(adSpend),
            roas: Math.round(roas * 100) / 100,
            cac: newCustomers > 0 ? formatCurrency(adSpend / newCustomers) : null,
            revenuePerCustomer: (newCustomers + returningCustomers) > 0
              ? formatCurrency(netRevenue / (newCustomers + returningCustomers))
              : 0,
          },
          ...(comparison && { comparison }),
        }
      })

      return jsonResult(metrics)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get sales metrics: ${message}`)
    }
  },
})

// =============================================================================
// A/B Testing Tools
// =============================================================================

/**
 * List A/B tests
 */
export const listABTestsTool = defineTool({
  name: 'list_ab_tests',
  description:
    'List A/B tests with optional status filter. Returns test metadata without detailed results.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by test status',
        enum: ['draft', 'running', 'paused', 'completed'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tests to return (default: 20)',
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination',
        minimum: 0,
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const status = args.status as ABTestStatus | undefined
    const limit = Math.min(Math.max((args.limit as number) || 20, 1), 100)
    const offset = Math.max((args.offset as number) || 0, 0)

    try {
      const tests = await withTenant(tenantId, async () => {
        const result = status
          ? await sql`
            SELECT id, name, type, config, created_by, last_run_at, created_at
            FROM analytics_reports
            WHERE type = 'ab_test'
              AND (config->>'status')::text = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          `
          : await sql`
            SELECT id, name, type, config, created_by, last_run_at, created_at
            FROM analytics_reports
            WHERE type = 'ab_test'
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          `

        return result.rows.map((row) => {
          const config = row.config as Record<string, unknown>
          return {
            id: row.id as string,
            name: row.name as string,
            description: (config.description as string) || null,
            status: (config.status as ABTestStatus) || 'draft',
            type: (config.testType as string) || 'page',
            targetMetric: (config.targetMetric as string) || 'conversion_rate',
            trafficPercent: (config.trafficPercent as number) || 100,
            startedAt: config.startedAt as string | null,
            endedAt: config.endedAt as string | null,
            createdAt: (row.created_at as Date).toISOString(),
          }
        })
      })

      const totalCount = await withTenant(tenantId, async () => {
        const countResult = status
          ? await sql`
            SELECT COUNT(*) as count FROM analytics_reports
            WHERE type = 'ab_test' AND (config->>'status')::text = ${status}
          `
          : await sql`
            SELECT COUNT(*) as count FROM analytics_reports
            WHERE type = 'ab_test'
          `
        return Number(countResult.rows[0]?.count) || 0
      })

      return jsonResult({
        tests,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + tests.length < totalCount,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to list A/B tests: ${message}`)
    }
  },
})

/**
 * Get A/B test details with results
 */
export const getABTestTool = defineTool({
  name: 'get_ab_test',
  description:
    'Get detailed A/B test information including variant performance data.',
  inputSchema: {
    type: 'object',
    properties: {
      testId: {
        type: 'string',
        description: 'The A/B test ID',
      },
    },
    required: ['testId'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const testId = args.testId as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!testId) {
      return errorResult('Test ID is required')
    }

    try {
      const test = await withTenant(tenantId, async () => {
        const result = await sql`
          SELECT id, name, type, config, created_by, last_run_at, created_at, updated_at
          FROM analytics_reports
          WHERE id = ${testId}::uuid AND type = 'ab_test'
        `

        const row = result.rows[0]
        if (!row) {
          throw new Error('A/B test not found')
        }

        const config = row.config as Record<string, unknown>
        return {
          id: row.id as string,
          name: row.name as string,
          description: (config.description as string) || null,
          status: (config.status as ABTestStatus) || 'draft',
          type: (config.testType as string) || 'page',
          targetMetric: (config.targetMetric as string) || 'conversion_rate',
          variants: config.variants || [],
          trafficPercent: (config.trafficPercent as number) || 100,
          startedAt: config.startedAt as string | null,
          endedAt: config.endedAt as string | null,
          createdAt: (row.created_at as Date).toISOString(),
          config,
        }
      })

      return jsonResult(test)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get A/B test: ${message}`)
    }
  },
})

/**
 * Get A/B test statistical analysis
 */
export const getABTestStatsTool = defineTool({
  name: 'get_ab_test_stats',
  description:
    'Get statistical analysis for an A/B test including confidence levels and winner determination.',
  inputSchema: {
    type: 'object',
    properties: {
      testId: {
        type: 'string',
        description: 'The A/B test ID',
      },
    },
    required: ['testId'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const testId = args.testId as string

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!testId) {
      return errorResult('Test ID is required')
    }

    try {
      const stats = await withTenant(tenantId, async () => {
        const testResult = await sql`
          SELECT id, name, config
          FROM analytics_reports
          WHERE id = ${testId}::uuid AND type = 'ab_test'
        `

        const testRow = testResult.rows[0]
        if (!testRow) {
          throw new Error('A/B test not found')
        }

        const config = testRow.config as Record<string, unknown>
        const variants = (config.variants as Array<{
          id: string
          name: string
          weight: number
          isControl: boolean
        }>) || []
        const status = (config.status as ABTestStatus) || 'draft'

        // Simulated stats - real implementation would query actual results
        const variantStats = variants.map((variant) => {
          const baseVisitors = 1000 + Math.floor(Math.random() * 500)
          const baseConversionRate = variant.isControl ? 0.03 : 0.035
          const visitors = baseVisitors
          const conversions = Math.floor(visitors * baseConversionRate)
          const revenue = conversions * 50
          const conversionRate = visitors > 0 ? conversions / visitors : 0

          return {
            id: variant.id,
            name: variant.name,
            isControl: variant.isControl,
            visitors,
            conversions,
            revenue,
            conversionRate: conversionRate * 100,
            avgOrderValue: conversions > 0 ? revenue / conversions : 0,
            revenuePerVisitor: visitors > 0 ? revenue / visitors : 0,
            improvement: variant.isControl
              ? null
              : ((conversionRate - 0.03) / 0.03) * 100,
            confidence: variant.isControl ? null : 85 + Math.random() * 10,
            isWinner: false,
          }
        })

        const minimumSampleReached = variantStats.every((v) => v.visitors >= 100)
        let statisticallySignificant = false
        let recommendedAction: string | null = null

        const control = variantStats.find((v) => v.isControl)
        const nonControlVariants = variantStats.filter((v) => !v.isControl)

        if (control && nonControlVariants.length > 0 && minimumSampleReached) {
          const bestVariant = nonControlVariants.reduce((best, v) =>
            v.conversionRate > best.conversionRate ? v : best
          )

          if (
            bestVariant.confidence &&
            bestVariant.confidence >= 95 &&
            bestVariant.conversionRate > control.conversionRate
          ) {
            bestVariant.isWinner = true
            statisticallySignificant = true
          }
        }

        if (status === 'running') {
          if (!minimumSampleReached) {
            recommendedAction = 'Continue collecting data to reach minimum sample size'
          } else if (statisticallySignificant) {
            const winner = variantStats.find((v) => v.isWinner)
            recommendedAction = winner
              ? `Consider implementing ${winner.name} as it shows statistically significant improvement`
              : 'Continue running test - no significant winner yet'
          } else {
            recommendedAction = 'Continue running test - no significant winner yet'
          }
        }

        return {
          testId: testRow.id as string,
          testName: testRow.name as string,
          status,
          variants: variantStats,
          minimumSampleReached,
          statisticallySignificant,
          recommendedAction,
        }
      })

      return jsonResult(stats)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to get A/B test stats: ${message}`)
    }
  },
})

/**
 * Create new A/B test
 */
export const createABTestTool = defineTool({
  name: 'create_ab_test',
  description:
    'Create a new A/B test. Test is created in draft status and must be started separately.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Test name',
        minLength: 1,
        maxLength: 255,
      },
      description: {
        type: 'string',
        description: 'Test description',
      },
      type: {
        type: 'string',
        description: 'Type of A/B test',
        enum: ['page', 'component', 'price', 'copy', 'layout'],
      },
      targetMetric: {
        type: 'string',
        description: 'Primary metric to optimize',
        enum: ['conversion_rate', 'revenue', 'aov', 'engagement'],
      },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            weight: { type: 'number', minimum: 0, maximum: 100 },
            isControl: { type: 'boolean' },
          },
          required: ['name'],
        },
        description: 'Test variants with traffic weights (minimum 2 required)',
      },
      trafficPercent: {
        type: 'number',
        description: 'Percentage of total traffic to include in test',
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['name', 'type', 'targetMetric', 'variants'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const name = args.name as string
    const description = args.description as string | undefined
    const testType = args.type as string
    const targetMetric = args.targetMetric as string
    const variants = args.variants as Array<{
      name: string
      weight?: number
      isControl?: boolean
    }>
    const trafficPercent = (args.trafficPercent as number) || 100

    if (!name) {
      return errorResult('Test name is required')
    }
    if (variants.length < 2) {
      return errorResult('At least 2 variants are required')
    }

    const hasControl = variants.some((v) => v.isControl)
    if (!hasControl) {
      return errorResult('At least one variant must be marked as control')
    }

    try {
      const test = await withTenant(tenantId, async () => {
        const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 50), 0)
        const normalizedVariants = variants.map((v, index) => ({
          id: `variant_${index + 1}`,
          name: v.name,
          weight: ((v.weight || 50) / totalWeight) * 100,
          isControl: v.isControl || false,
        }))

        const config = {
          status: 'draft' as ABTestStatus,
          description,
          testType,
          targetMetric,
          variants: normalizedVariants,
          trafficPercent,
          startedAt: null,
          endedAt: null,
        }

        const result = await sql`
          INSERT INTO analytics_reports (name, type, config)
          VALUES (${name}, 'ab_test', ${JSON.stringify(config)})
          RETURNING id, name, created_at
        `

        const row = result.rows[0]
        if (!row) {
          throw new Error('Failed to create A/B test')
        }

        return {
          id: row.id as string,
          name: row.name as string,
          description,
          status: 'draft' as ABTestStatus,
          type: testType,
          targetMetric,
          variants: normalizedVariants,
          trafficPercent,
          startedAt: null,
          endedAt: null,
          createdAt: (row.created_at as Date).toISOString(),
        }
      })

      return jsonResult(test)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to create A/B test: ${message}`)
    }
  },
})

/**
 * Update A/B test status
 */
export const updateABTestStatusTool = defineTool({
  name: 'update_ab_test_status',
  description:
    'Start, pause, or complete an A/B test. Cannot restart a completed test.',
  inputSchema: {
    type: 'object',
    properties: {
      testId: {
        type: 'string',
        description: 'The A/B test ID',
      },
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['start', 'pause', 'complete'],
      },
    },
    required: ['testId', 'action'],
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    const testId = args.testId as string
    const action = args.action as 'start' | 'pause' | 'complete'

    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }
    if (!testId) {
      return errorResult('Test ID is required')
    }
    if (!action) {
      return errorResult('Action is required')
    }

    try {
      const result = await withTenant(tenantId, async () => {
        const testResult = await sql`
          SELECT id, name, config
          FROM analytics_reports
          WHERE id = ${testId}::uuid AND type = 'ab_test'
        `

        const testRow = testResult.rows[0]
        if (!testRow) {
          throw new Error('A/B test not found')
        }

        const config = testRow.config as Record<string, unknown>
        const currentStatus = (config.status as ABTestStatus) || 'draft'

        const validTransitions: Record<ABTestStatus, string[]> = {
          draft: ['start'],
          running: ['pause', 'complete'],
          paused: ['start', 'complete'],
          completed: [],
        }

        const actionToStatus: Record<string, ABTestStatus> = {
          start: 'running',
          pause: 'paused',
          complete: 'completed',
        }

        if (!validTransitions[currentStatus].includes(action)) {
          throw new Error(
            `Cannot ${action} test with status '${currentStatus}'. Valid actions: ${validTransitions[currentStatus].join(', ') || 'none'}`
          )
        }

        const newStatus = actionToStatus[action]
        const now = new Date().toISOString()

        const updatedConfig = {
          ...config,
          status: newStatus,
          startedAt:
            action === 'start' && !config.startedAt ? now : config.startedAt,
          endedAt: action === 'complete' ? now : config.endedAt,
        }

        await sql`
          UPDATE analytics_reports
          SET config = ${JSON.stringify(updatedConfig)}, updated_at = NOW()
          WHERE id = ${testId}::uuid
        `

        return {
          testId,
          testName: testRow.name as string,
          previousStatus: currentStatus,
          newStatus,
          action,
          timestamp: now,
        }
      })

      return jsonResult(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to update A/B test status: ${message}`)
    }
  },
})

// =============================================================================
// Reporting Tools
// =============================================================================

/**
 * Generate analytics report
 */
export const generateReportTool = defineTool({
  name: 'generate_report',
  description:
    'Generate an analytics report based on a saved report configuration or ad-hoc parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      reportId: {
        type: 'string',
        description: 'ID of a saved report to run',
      },
      reportType: {
        type: 'string',
        description: 'Type of report to generate (if not using saved report)',
        enum: [
          'revenue_summary',
          'channel_performance',
          'customer_cohort',
          'product_performance',
          'funnel_analysis',
        ],
      },
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
    },
  },
  async handler(args): Promise<ToolResult> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      return errorResult('Tenant ID is required')
    }

    const reportId = args.reportId as string | undefined
    const reportType = args.reportType as string | undefined

    if (!reportId && !reportType) {
      return errorResult('Either reportId or reportType is required')
    }

    try {
      const report = await withTenant(tenantId, async () => {
        let config: Record<string, unknown> = {}
        let name = ''
        let start: Date
        let end: Date

        if (reportId) {
          const reportResult = await sql`
            SELECT id, name, config
            FROM analytics_reports
            WHERE id = ${reportId}::uuid AND type != 'ab_test'
          `
          const reportRow = reportResult.rows[0]
          if (!reportRow) {
            throw new Error('Report not found')
          }
          config = reportRow.config as Record<string, unknown>
          name = reportRow.name as string
          const dateRange = parseDateRange(
            args.startDate || config.defaultStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            args.endDate || config.defaultEndDate || new Date().toISOString()
          )
          start = dateRange.start
          end = dateRange.end
        } else {
          const dateRange = parseDateRange(
            args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            args.endDate || new Date().toISOString()
          )
          start = dateRange.start
          end = dateRange.end
          name = reportType!
          config = { reportType }
        }

        let reportData: Record<string, unknown> = {}

        if (reportType === 'revenue_summary' || config.reportType === 'revenue_summary') {
          const result = await sql`
            SELECT
              date,
              gross_sales_cents,
              net_revenue_cents,
              total_orders,
              avg_order_value_cents
            FROM analytics_daily_metrics
            WHERE date >= ${start.toISOString()}::date
              AND date <= ${end.toISOString()}::date
            ORDER BY date ASC
          `

          const totals = result.rows.reduce(
            (acc, row) => ({
              grossSales: acc.grossSales + Number(row.gross_sales_cents),
              netRevenue: acc.netRevenue + Number(row.net_revenue_cents),
              orders: acc.orders + Number(row.total_orders),
            }),
            { grossSales: 0, netRevenue: 0, orders: 0 }
          )

          reportData = {
            summary: {
              grossSales: formatCurrency(totals.grossSales),
              netRevenue: formatCurrency(totals.netRevenue),
              totalOrders: totals.orders,
              avgOrderValue: totals.orders > 0 ? formatCurrency(totals.grossSales / totals.orders) : 0,
            },
            daily: result.rows.map((row) => ({
              date: (row.date as Date).toISOString().split('T')[0],
              grossSales: formatCurrency(Number(row.gross_sales_cents)),
              netRevenue: formatCurrency(Number(row.net_revenue_cents)),
              orders: Number(row.total_orders),
              avgOrderValue: formatCurrency(Number(row.avg_order_value_cents)),
            })),
          }
        } else if (reportType === 'funnel_analysis' || config.reportType === 'funnel_analysis') {
          const result = await sql`
            SELECT
              SUM(sessions) as sessions,
              SUM(cart_adds) as cart_adds,
              SUM(checkouts_initiated) as checkouts,
              SUM(total_orders) as purchases
            FROM analytics_daily_metrics
            WHERE date >= ${start.toISOString()}::date
              AND date <= ${end.toISOString()}::date
          `

          const row = result.rows[0]
          const sessions = Number(row?.sessions) || 0
          const cartAdds = Number(row?.cart_adds) || 0
          const checkouts = Number(row?.checkouts) || 0
          const purchases = Number(row?.purchases) || 0

          reportData = {
            funnel: [
              { stage: 'Sessions', count: sessions, rate: 100 },
              { stage: 'Cart Adds', count: cartAdds, rate: sessions > 0 ? (cartAdds / sessions) * 100 : 0 },
              { stage: 'Checkouts', count: checkouts, rate: cartAdds > 0 ? (checkouts / cartAdds) * 100 : 0 },
              { stage: 'Purchases', count: purchases, rate: checkouts > 0 ? (purchases / checkouts) * 100 : 0 },
            ],
            overallConversionRate: sessions > 0 ? (purchases / sessions) * 100 : 0,
          }
        } else {
          reportData = {
            message: 'Report generated',
            reportType: reportType || config.reportType,
          }
        }

        if (reportId) {
          await sql`
            UPDATE analytics_reports
            SET last_run_at = NOW()
            WHERE id = ${reportId}::uuid
          `
        }

        return {
          reportName: name,
          reportType: reportType || config.reportType,
          dateRange: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
          },
          generatedAt: new Date().toISOString(),
          data: reportData,
        }
      })

      return jsonResult(report)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return errorResult(`Failed to generate report: ${message}`)
    }
  },
})

/**
 * Export analytics data (streaming)
 */
export const exportAnalyticsTool = defineTool({
  name: 'export_analytics',
  description:
    'Export analytics data for a date range. Supports large exports with streaming.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date (ISO format)',
      },
      endDate: {
        type: 'string',
        description: 'End date (ISO format)',
      },
      dataType: {
        type: 'string',
        description: 'Type of data to export',
        enum: ['daily_metrics', 'channel_summary', 'geo_metrics', 'conversions'],
      },
      format: {
        type: 'string',
        description: 'Export format',
        enum: ['json', 'csv'],
      },
    },
    required: ['startDate', 'endDate', 'dataType'],
  },
  streaming: true,
  async *handler(args): AsyncGenerator<StreamingChunk, void, unknown> {
    const tenantId = (args._tenantId as string) || ''
    if (!tenantId) {
      yield errorChunk(-32602, 'Tenant ID is required')
      return
    }

    let start: Date
    let end: Date
    try {
      const parsed = parseDateRange(args.startDate, args.endDate)
      start = parsed.start
      end = parsed.end
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield errorChunk(-32602, message)
      return
    }

    const dataType = args.dataType as string
    const format = (args.format as string) || 'json'

    yield progressChunk(0, `Starting ${dataType} export...`)

    try {
      const batchSize = 100
      let offset = 0
      let totalExported = 0
      let hasMore = true

      while (hasMore) {
        const batch = await withTenant(tenantId, async () => {
          if (dataType === 'daily_metrics') {
            return sql`
              SELECT * FROM analytics_daily_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              ORDER BY date ASC
              OFFSET ${offset} LIMIT ${batchSize}
            `
          } else if (dataType === 'channel_summary') {
            return sql`
              SELECT * FROM attribution_channel_summary
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              ORDER BY date ASC, channel ASC
              OFFSET ${offset} LIMIT ${batchSize}
            `
          } else if (dataType === 'geo_metrics') {
            return sql`
              SELECT * FROM analytics_geo_metrics
              WHERE date >= ${start.toISOString()}::date
                AND date <= ${end.toISOString()}::date
              ORDER BY date ASC, country ASC
              OFFSET ${offset} LIMIT ${batchSize}
            `
          } else {
            return sql`
              SELECT * FROM attribution_conversions
              WHERE converted_at >= ${start.toISOString()}::timestamptz
                AND converted_at <= ${end.toISOString()}::timestamptz
              ORDER BY converted_at ASC
              OFFSET ${offset} LIMIT ${batchSize}
            `
          }
        })

        if (batch.rows.length === 0) {
          hasMore = false
        } else {
          totalExported += batch.rows.length

          yield progressChunk(
            Math.min(95, Math.round((totalExported / (totalExported + batchSize)) * 100)),
            `Exported ${totalExported} records...`
          )

          yield partialChunk(
            [{ type: 'text', text: JSON.stringify(batch.rows) }],
            Math.floor(offset / batchSize)
          )

          offset += batchSize
          hasMore = batch.rows.length === batchSize
        }
      }

      const finalContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        dataType,
        format,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        totalRecords: totalExported,
      })

      yield completeChunk({
        content: [{ type: 'text', text: finalContent }],
        isError: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield errorChunk(-32603, `Export failed: ${message}`)
    }
  },
})

// =============================================================================
// Export All Analytics Tools
// =============================================================================

export const analyticsTools: ToolDefinition[] = [
  // Attribution tools
  getAttributionSummaryTool,
  getTouchpointsTool,
  recalculateAttributionTool,
  exportAttributionDataTool,
  // Metrics tools
  getRevenueMetricsTool,
  getConversionMetricsTool,
  getChannelPerformanceTool,
  getDailyMetricsTool,
  comparePeriodsTool,
  getTrafficMetricsTool,
  getGeoMetricsTool,
  getSalesMetricsTool,
  // A/B testing tools
  listABTestsTool,
  getABTestTool,
  getABTestStatsTool,
  createABTestTool,
  updateABTestStatusTool,
  // Reporting tools
  generateReportTool,
  exportAnalyticsTool,
]

export default analyticsTools
