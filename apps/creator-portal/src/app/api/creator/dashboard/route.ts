/**
 * Creator Dashboard API Route
 *
 * GET /api/creator/dashboard - Fetch dashboard data with cross-brand statistics
 */

import { sql } from '@cgk/db'

import { loadBrandMemberships, requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Fetch dashboard data
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
    // Load full brand memberships with balances
    const memberships = await loadBrandMemberships(context.creatorId)

    // Aggregate statistics across all brands
    const totalBalanceCents = memberships.reduce((sum, m) => sum + m.balanceCents, 0)
    const totalPendingCents = memberships.reduce((sum, m) => sum + m.pendingCents, 0)
    const totalLifetimeEarningsCents = memberships.reduce(
      (sum, m) => sum + m.lifetimeEarningsCents,
      0
    )
    const activeProjectsCount = memberships.reduce(
      (sum, m) => sum + m.activeProjectsCount,
      0
    )
    const completedProjectsCount = memberships.reduce(
      (sum, m) => sum + m.completedProjectsCount,
      0
    )

    // Get unread messages count
    const unreadResult = await sql`
      SELECT COALESCE(SUM(unread_creator), 0) as total_unread
      FROM creator_conversations
      WHERE creator_id = ${context.creatorId}
        AND status != 'archived'
    `
    const unreadMessagesCount = parseInt(
      (unreadResult.rows[0]?.total_unread as string) || '0',
      10
    )

    // Get creator profile data for alerts
    const creatorResult = await sql`
      SELECT
        tax_form_status,
        onboarding_completed,
        guided_tour_completed,
        first_login_at,
        name
      FROM creators
      WHERE id = ${context.creatorId}
    `
    const creator = creatorResult.rows[0]

    // Check for unsigned contracts
    const unsignedContractsCount = memberships.filter(
      (m) => m.status === 'active' && !m.contractSigned
    ).length

    // Get recent activity (placeholder - would query from activity log)
    const recentActivity: Array<{
      id: string
      type: string
      description: string
      brandName: string | null
      amountCents: number | null
      createdAt: string
    }> = []

    return Response.json({
      creator: {
        id: context.creatorId,
        name: creator?.name || context.name,
        email: context.email,
        taxFormStatus: creator?.tax_form_status || 'pending',
        onboardingCompleted: creator?.onboarding_completed || false,
        guidedTourCompleted: creator?.guided_tour_completed || false,
        isFirstLogin: !creator?.first_login_at,
      },
      stats: {
        totalBalanceCents,
        totalPendingCents,
        totalLifetimeEarningsCents,
        activeProjectsCount,
        completedProjectsCount,
        unreadMessagesCount,
      },
      memberships: memberships.map((m) => ({
        id: m.id,
        brandId: m.brandId,
        brandName: m.brandName,
        brandSlug: m.brandSlug,
        brandLogo: m.brandLogo,
        status: m.status,
        commissionPercent: m.commissionPercent,
        discountCode: m.discountCode,
        balanceCents: m.balanceCents,
        pendingCents: m.pendingCents,
        lifetimeEarningsCents: m.lifetimeEarningsCents,
        activeProjectsCount: m.activeProjectsCount,
        completedProjectsCount: m.completedProjectsCount,
        contractSigned: m.contractSigned,
      })),
      alerts: {
        taxFormPending: creator?.tax_form_status === 'pending',
        unsignedContractsCount,
        showGuidedTour: !creator?.guided_tour_completed,
      },
      recentActivity,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return Response.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
