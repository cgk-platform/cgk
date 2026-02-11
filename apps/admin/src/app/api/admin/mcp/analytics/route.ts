export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/mcp/analytics
 *
 * Returns MCP usage analytics for the current tenant.
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const days = parseInt(url.searchParams.get('days') || '7', 10)

  const result = await withTenant(tenantSlug, async () => {
    // Check if mcp_usage table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'mcp_usage'
      ) as exists
    `

    if (!tableCheck.rows[0]?.exists) {
      return {
        summary: {
          totalToolCalls: 0,
          uniqueTools: 0,
          totalTokens: 0,
          avgTokensPerSession: 0,
          errorRate: 0,
          uniqueSessions: 0,
        },
        toolUsage: [],
        categoryUsage: [],
        tokenUsage: [],
        recentActivity: [],
        topErrors: [],
        unusedTools: [],
      }
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get summary stats
    const summaryResult = await sql`
      SELECT
        COUNT(*) as total_calls,
        COUNT(DISTINCT tool_name) as unique_tools,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) FILTER (WHERE status = 'error') as error_count
      FROM mcp_usage
      WHERE created_at >= ${startDate.toISOString()}
    `

    const summary = summaryResult.rows[0]
    const totalCalls = Number(summary?.total_calls) || 0
    const errorCount = Number(summary?.error_count) || 0
    const uniqueSessions = Number(summary?.unique_sessions) || 1

    // Get tool usage
    const toolUsageResult = await sql`
      SELECT
        tool_name as name,
        category,
        COUNT(*) as calls
      FROM mcp_usage
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY tool_name, category
      ORDER BY calls DESC
      LIMIT 20
    `

    // Get category usage
    const categoryUsageResult = await sql`
      SELECT
        category,
        COUNT(*) as calls
      FROM mcp_usage
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY category
      ORDER BY calls DESC
    `

    // Get recent activity
    const recentActivityResult = await sql`
      SELECT
        id,
        tool_name as tool,
        status,
        duration_ms as duration,
        created_at as timestamp
      FROM mcp_usage
      WHERE created_at >= ${startDate.toISOString()}
      ORDER BY created_at DESC
      LIMIT 50
    `

    // Get top errors
    const topErrorsResult = await sql`
      SELECT
        error_message as error,
        COUNT(*) as count
      FROM mcp_usage
      WHERE created_at >= ${startDate.toISOString()}
        AND status = 'error'
        AND error_message IS NOT NULL
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `

    return {
      summary: {
        totalToolCalls: totalCalls,
        uniqueTools: Number(summary?.unique_tools) || 0,
        totalTokens: Number(summary?.total_tokens) || 0,
        avgTokensPerSession: Math.round(Number(summary?.total_tokens || 0) / uniqueSessions),
        errorRate: totalCalls > 0 ? Math.round((errorCount / totalCalls) * 100) : 0,
        uniqueSessions,
      },
      toolUsage: toolUsageResult.rows.map(row => ({
        name: row.name,
        calls: Number(row.calls),
        category: row.category || 'uncategorized',
      })),
      categoryUsage: categoryUsageResult.rows.map(row => ({
        category: row.category || 'uncategorized',
        calls: Number(row.calls),
      })),
      tokenUsage: [],
      recentActivity: recentActivityResult.rows.map(row => ({
        id: row.id,
        tool: row.tool,
        status: row.status,
        duration: row.duration,
        timestamp: row.timestamp,
      })),
      topErrors: topErrorsResult.rows.map(row => ({
        error: row.error,
        count: Number(row.count),
      })),
      unusedTools: [],
    }
  })

  return NextResponse.json(result)
}
