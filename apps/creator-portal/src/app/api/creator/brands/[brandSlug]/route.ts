/**
 * Creator Brand Detail API Route
 *
 * GET /api/creator/brands/[brandSlug] - Get full brand detail with earnings
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import type { BrandDetail, BrandProject } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ brandSlug: string }>
}

/**
 * Fetch detailed brand information for the authenticated creator
 *
 * Returns comprehensive brand data including:
 * - Brand info and membership status
 * - Earnings breakdown (balance, pending, YTD, lifetime)
 * - Coordinator contact information
 * - Payment terms and entitlements
 * - Discount code stats
 * - Recent projects
 */
export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { brandSlug } = await params

  if (!brandSlug) {
    return Response.json({ error: 'Brand slug is required' }, { status: 400 })
  }

  try {
    // Get brand membership with organization details
    const membershipResult = await sql`
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
        cm.joined_at as "joinedAt",
        cm.coordinator_id as "coordinatorId",
        cm.payment_terms as "paymentTerms",
        cm.sample_product_entitlement as "sampleProductEntitlement"
      FROM creator_memberships cm
      JOIN organizations o ON o.id = cm.organization_id
      WHERE cm.creator_id = ${context.creatorId}
        AND o.slug = ${brandSlug}
    `

    if (membershipResult.rows.length === 0) {
      return Response.json({ error: 'Brand not found or no access' }, { status: 404 })
    }

    const membership = membershipResult.rows[0]
    if (!membership) {
      return Response.json({ error: 'Brand membership not found' }, { status: 404 })
    }

    // Get coordinator info if assigned
    let coordinatorName: string | null = null
    let coordinatorEmail: string | null = null

    if (membership.coordinatorId) {
      const coordinatorResult = await sql`
        SELECT name, email
        FROM users
        WHERE id = ${membership.coordinatorId}
      `
      if (coordinatorResult.rows.length > 0) {
        const coordinatorRow = coordinatorResult.rows[0]
        if (coordinatorRow) {
          coordinatorName = coordinatorRow.name as string
          coordinatorEmail = coordinatorRow.email as string
        }
      }
    }

    // Get YTD earnings
    const startOfYear = new Date()
    startOfYear.setMonth(0, 1)
    startOfYear.setHours(0, 0, 0, 0)

    const ytdResult = await sql`
      SELECT COALESCE(SUM(amount_cents), 0) as "ytdEarnings"
      FROM creator_earnings
      WHERE creator_id = ${context.creatorId}
        AND organization_id = ${membership.brandId}
        AND created_at >= ${startOfYear.toISOString()}
        AND status = 'completed'
    `

    const ytdEarningsCents = Number(ytdResult.rows[0]?.ytdEarnings || 0)

    // Get discount code stats
    let discountCodeUsageCount = 0
    let discountCodeRevenueAttributedCents = 0

    if (membership.discountCode) {
      const discountStatsResult = await sql`
        SELECT
          COUNT(*) as "usageCount",
          COALESCE(SUM(order_total_cents), 0) as "revenueAttributed"
        FROM discount_code_usages
        WHERE code = ${membership.discountCode}
          AND creator_id = ${context.creatorId}
      `
      if (discountStatsResult.rows.length > 0) {
        const statsRow = discountStatsResult.rows[0]
        if (statsRow) {
          discountCodeUsageCount = Number(statsRow.usageCount)
          discountCodeRevenueAttributedCents = Number(statsRow.revenueAttributed)
        }
      }
    }

    // Get recent projects (last 5)
    const projectsResult = await sql`
      SELECT
        id,
        name,
        status,
        earnings_cents as "earningsCents",
        due_date as "dueDate",
        completed_at as "completedAt"
      FROM creator_projects
      WHERE creator_id = ${context.creatorId}
        AND organization_id = ${membership.brandId}
      ORDER BY created_at DESC
      LIMIT 5
    `

    const recentProjects: BrandProject[] = projectsResult.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      status: row.status as BrandProject['status'],
      earningsCents: Number(row.earningsCents),
      dueDate: row.dueDate ? new Date(row.dueDate as string) : null,
      completedAt: row.completedAt ? new Date(row.completedAt as string) : null,
    }))

    // Build share link for discount code
    const shareLink = membership.discountCode
      ? `${process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || ''}/d/${membership.discountCode}`
      : null

    if (!membership) {
      return Response.json({ error: 'Invalid membership data' }, { status: 500 })
    }

    const brandDetail: BrandDetail = {
      id: membership.id as string,
      brandId: membership.brandId as string,
      brandName: membership.brandName as string,
      brandSlug: membership.brandSlug as string,
      brandLogo: membership.brandLogo as string | null,
      status: membership.status as BrandDetail['status'],
      commissionPercent: Number(membership.commissionPercent),
      discountCode: membership.discountCode as string | null,
      balanceCents: Number(membership.balanceCents),
      pendingCents: Number(membership.pendingCents),
      lifetimeEarningsCents: Number(membership.lifetimeEarningsCents),
      contractSigned: Boolean(membership.contractSigned),
      contractSignedAt: membership.contractSignedAt ? new Date(membership.contractSignedAt as string) : null,
      activeProjectsCount: Number(membership.activeProjectsCount),
      completedProjectsCount: Number(membership.completedProjectsCount),
      lastProjectAt: membership.lastProjectAt ? new Date(membership.lastProjectAt as string) : null,
      lastPayoutAt: membership.lastPayoutAt ? new Date(membership.lastPayoutAt as string) : null,
      joinedAt: new Date(membership.joinedAt as string),
      coordinatorName,
      coordinatorEmail,
      paymentTerms: (membership.paymentTerms as string) || 'Net 30',
      sampleProductEntitlement: Boolean(membership.sampleProductEntitlement),
      shareLink,
      discountCodeUsageCount,
      discountCodeRevenueAttributedCents,
      ytdEarningsCents,
      recentProjects,
    }

    return Response.json({ brand: brandDetail })
  } catch (error) {
    console.error('Error fetching brand detail:', error)
    return Response.json({ error: 'Failed to fetch brand details' }, { status: 500 })
  }
}
