/**
 * Rewards Page
 *
 * Displays loyalty points balance, tier status, history, and available rewards.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { defaultContent } from '@/lib/account/content'
import type {
  LoyaltyAccount,
  LoyaltyTierInfo,
  PointsTransaction,
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

async function getLoyaltyData(): Promise<LoyaltyResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3002'
  const response = await fetch(`${baseUrl}/api/account/loyalty`, {
    cache: 'no-store',
    headers: {
      'Cookie': '', // Will be populated by server
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch loyalty data')
  }

  return response.json()
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
    data = await getLoyaltyData()
  } catch {
    // Return empty state if API fails (table might not exist yet)
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
      {/* Points Balance Card Skeleton */}
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

      {/* Tier Benefits Skeleton */}
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

      {/* Rewards Grid Skeleton */}
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

      {/* History Skeleton */}
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
