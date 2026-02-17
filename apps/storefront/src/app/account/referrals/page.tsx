/**
 * Referrals Page
 *
 * Displays referral code, share options, stats, and reward history.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { defaultContent, getContent } from '@/lib/account/content'
import type { ReferralCode, ReferralStats, Referral, ReferralReward } from '@/lib/account/types'
import { ReferralsClient } from './components'

export const metadata: Metadata = {
  title: 'Refer a Friend',
  description: 'Share your referral code and earn rewards',
}

export const dynamic = 'force-dynamic'

interface ReferralsResponse {
  code: ReferralCode
  stats: ReferralStats
  referrals: Referral[]
  rewards: ReferralReward[]
}

async function getReferralsData(): Promise<ReferralsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3002'
  const response = await fetch(`${baseUrl}/api/account/referrals`, {
    cache: 'no-store',
    headers: {
      'Cookie': '', // Will be populated by server
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch referrals data')
  }

  return response.json()
}

export default async function ReferralsPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(defaultContent, 'referrals.title')}
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
          {getContent(defaultContent, 'referrals.description')}
        </p>
      </div>

      {/* Referrals Content */}
      <Suspense fallback={<ReferralsSkeleton />}>
        <ReferralsContent />
      </Suspense>
    </div>
  )
}

async function ReferralsContent() {
  let data: ReferralsResponse

  try {
    data = await getReferralsData()
  } catch {
    // Return empty state if API fails (table might not exist yet)
    data = {
      code: {
        code: '',
        shareUrl: '',
        discountType: 'percentage',
        discountValue: 10,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
      stats: {
        totalInvited: 0,
        totalConverted: 0,
        totalEarned: 0,
        pendingRewards: 0,
        currencyCode: 'USD',
        conversionRate: 0,
      },
      referrals: [],
      rewards: [],
    }
  }

  return <ReferralsClient data={data} content={defaultContent} />
}

function ReferralsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Referral Code Card Skeleton */}
      <div className="animate-pulse rounded-2xl bg-[hsl(var(--portal-muted))] p-8">
        <div className="space-y-4">
          <div className="h-4 w-32 rounded bg-[hsl(var(--portal-muted))]/70" />
          <div className="h-12 w-48 rounded bg-[hsl(var(--portal-muted))]/70" />
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded bg-[hsl(var(--portal-muted))]/70" />
            <div className="h-10 w-10 rounded bg-[hsl(var(--portal-muted))]/70" />
            <div className="h-10 w-10 rounded bg-[hsl(var(--portal-muted))]/70" />
            <div className="h-10 w-10 rounded bg-[hsl(var(--portal-muted))]/70" />
          </div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6"
          >
            <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-2 h-8 w-16 rounded bg-[hsl(var(--portal-muted))]" />
          </div>
        ))}
      </div>

      {/* History Skeleton */}
      <div className="rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] overflow-hidden">
        <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
          <div className="h-5 w-36 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
        </div>
        <div className="divide-y divide-[hsl(var(--portal-border))]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[hsl(var(--portal-muted))]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
