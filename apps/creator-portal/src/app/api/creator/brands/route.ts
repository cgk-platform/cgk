/**
 * Creator Brands API Route
 *
 * GET /api/creator/brands - List all brand memberships with stats
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type { BrandMembership } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch all brand memberships for the authenticated creator
 *
 * Returns brand relationships with earnings, status, and project counts.
 * Only returns brands the creator has an active or paused membership with.
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    // Query brand memberships with organization details
    // Using public schema for organizations and creators tables
    const result = await sql`
      SELECT
        cm.id,
        cm.organization_id as "brandId",
        o.name as "brandName",
        o.slug as "brandSlug",
        o.logo_url as "brandLogo",
        cm.status,
        cm.commission_percent as "commissionPercent",
        cm.discount_code as "discountCode",
        cm.balance_cents as "balanceCents",
        cm.pending_cents as "pendingCents",
        cm.lifetime_earnings_cents as "lifetimeEarningsCents",
        cm.contract_signed as "contractSigned",
        cm.contract_signed_at as "contractSignedAt",
        cm.active_projects_count as "activeProjectsCount",
        cm.completed_projects_count as "completedProjectsCount",
        cm.last_project_at as "lastProjectAt",
        cm.last_payout_at as "lastPayoutAt",
        cm.joined_at as "joinedAt"
      FROM creator_memberships cm
      JOIN organizations o ON o.id = cm.organization_id
      WHERE cm.creator_id = ${context.creatorId}
        AND cm.status IN ('active', 'paused', 'pending')
      ORDER BY
        CASE cm.status
          WHEN 'active' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'paused' THEN 3
          ELSE 4
        END,
        cm.lifetime_earnings_cents DESC
    `

    const memberships: BrandMembership[] = result.rows.map((row) => ({
      id: row.id as string,
      brandId: row.brandId as string,
      brandName: row.brandName as string,
      brandSlug: row.brandSlug as string,
      brandLogo: row.brandLogo as string | null,
      status: row.status as BrandMembership['status'],
      commissionPercent: Number(row.commissionPercent),
      discountCode: row.discountCode as string | null,
      balanceCents: Number(row.balanceCents),
      pendingCents: Number(row.pendingCents),
      lifetimeEarningsCents: Number(row.lifetimeEarningsCents),
      contractSigned: Boolean(row.contractSigned),
      contractSignedAt: row.contractSignedAt ? new Date(row.contractSignedAt as string) : null,
      activeProjectsCount: Number(row.activeProjectsCount),
      completedProjectsCount: Number(row.completedProjectsCount),
      lastProjectAt: row.lastProjectAt ? new Date(row.lastProjectAt as string) : null,
      lastPayoutAt: row.lastPayoutAt ? new Date(row.lastPayoutAt as string) : null,
      joinedAt: new Date(row.joinedAt as string),
    }))

    // Calculate aggregate stats
    const stats = {
      totalBrands: memberships.length,
      activeBrands: memberships.filter((m) => m.status === 'active').length,
      totalBalanceCents: memberships.reduce((sum, m) => sum + m.balanceCents, 0),
      totalPendingCents: memberships.reduce((sum, m) => sum + m.pendingCents, 0),
      totalLifetimeEarningsCents: memberships.reduce((sum, m) => sum + m.lifetimeEarningsCents, 0),
      totalActiveProjects: memberships.reduce((sum, m) => sum + m.activeProjectsCount, 0),
    }

    return Response.json({
      memberships,
      stats,
    })
  } catch (error) {
    console.error('Error fetching creator brands:', error)
    return Response.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}
