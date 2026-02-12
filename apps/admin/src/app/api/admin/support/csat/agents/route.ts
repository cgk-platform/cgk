/**
 * CSAT Agent Scores API
 *
 * GET /api/admin/support/csat/agents - Get per-agent CSAT scores
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { getAgentCSATScores } from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)

    const scores = await getAgentCSATScores(tenantId, Math.min(days, 365))

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('[csat/agents] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent scores' },
      { status: 500 }
    )
  }
}
