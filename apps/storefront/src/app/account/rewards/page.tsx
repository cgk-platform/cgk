/**
 * Rewards Page
 *
 * Displays loyalty points balance, tier status, history, and available rewards.
 * Uses direct server-side data fetching instead of self-fetch.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import { defaultContent } from '@/lib/account/content'
import type {
  LoyaltyAccount,
  LoyaltyTier,
  LoyaltyTierInfo,
  PointsTransaction,
  PointsTransactionType,
  LoyaltyReward,
} from '@/lib/account/types'
import { RewardsClient } from './components'

export const metadata: Metadata = {
  title: 'Rewards',
  description: 'View your points balance, tier status, and available rewards',
}

export const dynamic = 'force-dynamic'

interface LoyaltyResponse {
  account: LoyaltyAccount
  tiers: LoyaltyTierInfo[]
  history: PointsTransaction[]
  rewards: LoyaltyReward[]
}

async function getLoyaltyData(): Promise<LoyaltyResponse | null> {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug || !session) {
    return null
  }

  return withTenant(tenantSlug, async () => {
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
      SELECT id, customer_id, current_points, lifetime_points, tier_key, tier_expires_at, member_since
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
      const insertResult = await sql<{
        id: string
        current_points: number
        lifetime_points: number
        tier_key: string
        tier_expires_at: string | null
        member_since: string
      }>`
        INSERT INTO customer_loyalty_accounts (
          customer_id, current_points, lifetime_points, tier_key
        ) VALUES (
          ${session.customerId}, 0, 0, 'bronze'
        )
        RETURNING id, current_points, lifetime_points, tier_key, tier_expires_at, member_since
      `

      const row = insertResult.rows[0]
      if (!row) throw new Error('Failed to create loyalty account')

      accountId = row.id
      currentPoints = row.current_points
      lifetimePoints = row.lifetime_points
      tierKey = row.tier_key
      tierExpiresAt = row.tier_expires_at
      memberSince = row.member_since
    } else {
      const row = accountResult.rows[0]
      if (!row) throw new Error('Loyalty account not found')
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
      SELECT tier_key, name, min_points, max_points, benefits, points_multiplier
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
      SELECT id, type, points, description, order_id, created_at, expires_at
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
      SELECT id, name, description, points_cost, reward_type, reward_value, image_url,
             is_active, min_tier, quantity_available, quantity_redeemed, expires_at
      FROM loyalty_rewards
      WHERE is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY points_cost ASC
    `

    const tierRanks: Record<string, number> = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
    }
    const customerTierRank = tierRanks[tierKey] || 1

    const rewards: LoyaltyReward[] = rewardsResult.rows
      .filter((row) => {
        if (row.min_tier) {
          const requiredTierRank = tierRanks[row.min_tier] || 1
          if (customerTierRank < requiredTierRank) return false
        }
        if (row.quantity_available !== null && row.quantity_redeemed >= row.quantity_available) return false
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

    return { account, tiers, history, rewards }
  })
}

export default async function RewardsPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            Rewards
          </h1>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </Link>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          Earn points with every purchase and redeem them for exclusive rewards
        </p>
      </div>

      {/* Rewards Content */}
      <Suspense fallback={<RewardsSkeleton />}>
        <RewardsContent />
      </Suspense>
    </div>
  )
}

async function RewardsContent() {
  let data: LoyaltyResponse

  try {
    const result = await getLoyaltyData()
    if (!result) {
      throw new Error('Not authenticated')
    }
    data = result
  } catch {
    data = {
      account: {
        id: '',
        currentPoints: 0,
        lifetimePoints: 0,
        tier: 'bronze',
        tierProgress: 0,
        pointsToNextTier: 1000,
        nextTier: 'silver',
        tierExpiresAt: null,
        memberSince: new Date().toISOString(),
      },
      tiers: [
        { tier: 'bronze', name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: ['Free shipping on orders over $50'], multiplier: 1.0 },
        { tier: 'silver', name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: ['Free shipping on all orders', '10% bonus points'], multiplier: 1.1 },
        { tier: 'gold', name: 'Gold', minPoints: 5000, maxPoints: 9999, benefits: ['Free express shipping', '20% bonus points'], multiplier: 1.2 },
        { tier: 'platinum', name: 'Platinum', minPoints: 10000, maxPoints: null, benefits: ['50% bonus points', 'VIP experiences'], multiplier: 1.5 },
      ],
      history: [],
      rewards: [],
    }
  }

  return <RewardsClient data={data} content={defaultContent} />
}

function RewardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-2xl bg-[hsl(var(--portal-muted))] p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))]/70" />
            <div className="h-10 w-32 rounded bg-[hsl(var(--portal-muted))]/70" />
          </div>
          <div className="space-y-3 text-right">
            <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]/70 ml-auto" />
            <div className="h-8 w-24 rounded bg-[hsl(var(--portal-muted))]/70 ml-auto" />
          </div>
        </div>
        <div className="mt-6 h-2 w-full rounded bg-[hsl(var(--portal-muted))]/70" />
        <div className="mt-2 flex justify-between">
          <div className="h-3 w-16 rounded bg-[hsl(var(--portal-muted))]/70" />
          <div className="h-3 w-24 rounded bg-[hsl(var(--portal-muted))]/70" />
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-48 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4"
          >
            <div className="h-20 w-full rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-4 h-5 w-24 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-2 h-4 w-32 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-4 h-10 w-full rounded bg-[hsl(var(--portal-muted))]" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] overflow-hidden">
        <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
        </div>
        <div className="divide-y divide-[hsl(var(--portal-border))]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[hsl(var(--portal-muted))]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
