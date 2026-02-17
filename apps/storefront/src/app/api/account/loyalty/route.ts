export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type {
  LoyaltyAccount,
  LoyaltyTier,
  LoyaltyTierInfo,
  PointsTransaction,
  PointsTransactionType,
  LoyaltyReward,
} from '@/lib/account/types'

/**
 * GET /api/account/loyalty
 * Returns the customer's loyalty account, tiers, points history, and available rewards
 */
export async function GET() {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await withTenant(tenantSlug, async () => {
    // Get or create loyalty account
    let accountResult = await sql<{
      id: string
      customer_id: string
      current_points: number
      lifetime_points: number
      tier_key: string
      tier_expires_at: string | null
      member_since: string
    }>`
      SELECT
        id,
        customer_id,
        current_points,
        lifetime_points,
        tier_key,
        tier_expires_at,
        member_since
      FROM customer_loyalty_accounts
      WHERE customer_id = ${session.customerId}
      LIMIT 1
    `

    let accountId: string
    let currentPoints: number
    let lifetimePoints: number
    let tierKey: string
    let tierExpiresAt: string | null
    let memberSince: string

    if (accountResult.rows.length === 0) {
      // Create new loyalty account
      const insertResult = await sql<{
        id: string
        current_points: number
        lifetime_points: number
        tier_key: string
        tier_expires_at: string | null
        member_since: string
      }>`
        INSERT INTO customer_loyalty_accounts (
          customer_id,
          current_points,
          lifetime_points,
          tier_key
        ) VALUES (
          ${session.customerId},
          0,
          0,
          'bronze'
        )
        RETURNING id, current_points, lifetime_points, tier_key, tier_expires_at, member_since
      `

      const row = insertResult.rows[0]
      if (!row) {
        throw new Error('Failed to create loyalty account')
      }

      accountId = row.id
      currentPoints = row.current_points
      lifetimePoints = row.lifetime_points
      tierKey = row.tier_key
      tierExpiresAt = row.tier_expires_at
      memberSince = row.member_since
    } else {
      const row = accountResult.rows[0]
      if (!row) {
        throw new Error('Loyalty account not found')
      }
      accountId = row.id
      currentPoints = row.current_points
      lifetimePoints = row.lifetime_points
      tierKey = row.tier_key
      tierExpiresAt = row.tier_expires_at
      memberSince = row.member_since
    }

    // Get all tiers
    const tiersResult = await sql<{
      tier_key: string
      name: string
      min_points: number
      max_points: number | null
      benefits: string[]
      points_multiplier: number
    }>`
      SELECT
        tier_key,
        name,
        min_points,
        max_points,
        benefits,
        points_multiplier
      FROM loyalty_tier_config
      ORDER BY sort_order ASC
    `

    const tiers: LoyaltyTierInfo[] = tiersResult.rows.map((row) => ({
      tier: row.tier_key as LoyaltyTier,
      name: row.name,
      minPoints: row.min_points,
      maxPoints: row.max_points,
      benefits: Array.isArray(row.benefits) ? row.benefits : JSON.parse(row.benefits as unknown as string),
      multiplier: Number(row.points_multiplier),
    }))

    // Calculate tier progress
    const currentTier = tiers.find((t) => t.tier === tierKey)
    const currentTierIndex = tiers.findIndex((t) => t.tier === tierKey)
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null

    let tierProgress = 100
    let pointsToNextTier: number | null = null

    if (currentTier && nextTier) {
      const rangeStart = currentTier.minPoints
      const rangeEnd = nextTier.minPoints
      const progressInRange = lifetimePoints - rangeStart
      tierProgress = Math.min(100, Math.round((progressInRange / (rangeEnd - rangeStart)) * 100))
      pointsToNextTier = Math.max(0, nextTier.minPoints - lifetimePoints)
    }

    const account: LoyaltyAccount = {
      id: accountId,
      currentPoints,
      lifetimePoints,
      tier: tierKey as LoyaltyTier,
      tierProgress,
      pointsToNextTier,
      nextTier: nextTier?.tier ?? null,
      tierExpiresAt,
      memberSince,
    }

    // Get points history
    const historyResult = await sql<{
      id: string
      type: string
      points: number
      description: string
      order_id: string | null
      created_at: string
      expires_at: string | null
    }>`
      SELECT
        id,
        type,
        points,
        description,
        order_id,
        created_at,
        expires_at
      FROM customer_loyalty_transactions
      WHERE customer_id = ${session.customerId}
      ORDER BY created_at DESC
      LIMIT 50
    `

    const history: PointsTransaction[] = historyResult.rows.map((row) => ({
      id: row.id,
      type: row.type as PointsTransactionType,
      points: row.points,
      description: row.description,
      orderId: row.order_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }))

    // Get available rewards
    const rewardsResult = await sql<{
      id: string
      name: string
      description: string | null
      points_cost: number
      reward_type: string
      reward_value: number | null
      image_url: string | null
      is_active: boolean
      min_tier: string | null
      quantity_available: number | null
      quantity_redeemed: number
      expires_at: string | null
    }>`
      SELECT
        id,
        name,
        description,
        points_cost,
        reward_type,
        reward_value,
        image_url,
        is_active,
        min_tier,
        quantity_available,
        quantity_redeemed,
        expires_at
      FROM loyalty_rewards
      WHERE is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY points_cost ASC
    `

    // Calculate tier rank for filtering
    const tierRanks: Record<string, number> = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
    }
    const customerTierRank = tierRanks[tierKey] || 1

    const rewards: LoyaltyReward[] = rewardsResult.rows
      .filter((row) => {
        // Check tier requirement
        if (row.min_tier) {
          const requiredTierRank = tierRanks[row.min_tier] || 1
          if (customerTierRank < requiredTierRank) {
            return false
          }
        }
        // Check quantity available
        if (row.quantity_available !== null && row.quantity_redeemed >= row.quantity_available) {
          return false
        }
        return true
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        pointsCost: row.points_cost,
        type: row.reward_type as 'discount' | 'free_product' | 'free_shipping' | 'exclusive_access',
        value: row.reward_value,
        imageUrl: row.image_url,
        isAvailable: currentPoints >= row.points_cost,
        expiresAt: row.expires_at,
      }))

    return {
      account,
      tiers,
      history,
      rewards,
    }
  })

  return NextResponse.json(data)
}
