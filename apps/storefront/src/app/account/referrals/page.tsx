/**
 * Referrals Page
 *
 * Displays referral code, share options, stats, and reward history.
 * Uses direct server-side data fetching instead of self-fetch.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'
import { defaultContent, getContent } from '@/lib/account/content'
import type {
  ReferralCode,
  ReferralStats,
  Referral,
  ReferralReward,
  ReferralStatus,
} from '@/lib/account/types'
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

function generateReferralCode(customerId: string): string {
  const prefix = customerId.slice(-4).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${random}`
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '****@****'
  const maskedLocal = local.slice(0, 2) + '***'
  return `${maskedLocal}@${domain}`
}

async function getReferralsData(): Promise<ReferralsResponse | null> {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug || !session) {
    return null
  }

  return withTenant(tenantSlug, async () => {
    // Get or create referral code for customer
    const codeResult = await sql<{
      id: string
      code: string
      share_url: string | null
      discount_type: string
      discount_value: number
      created_at: string
      expires_at: string | null
    }>`
      SELECT
        id, code, share_url, discount_type, discount_value, created_at, expires_at
      FROM customer_referral_codes
      WHERE customer_id = ${session.customerId}
        AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `

    let referralCode: ReferralCode

    if (codeResult.rows.length === 0) {
      const newCode = generateReferralCode(session.customerId)
      const shareUrl = `${process.env.NEXT_PUBLIC_STOREFRONT_URL || ''}/ref/${newCode}`

      const insertResult = await sql<{
        id: string
        code: string
        share_url: string | null
        discount_type: string
        discount_value: number
        created_at: string
        expires_at: string | null
      }>`
        INSERT INTO customer_referral_codes (
          customer_id, code, share_url, discount_type, discount_value
        ) VALUES (
          ${session.customerId}, ${newCode}, ${shareUrl}, 'percentage', 10
        )
        RETURNING id, code, share_url, discount_type, discount_value, created_at, expires_at
      `

      const row = insertResult.rows[0]
      if (!row) throw new Error('Failed to create referral code')

      referralCode = {
        code: row.code,
        shareUrl: row.share_url || shareUrl,
        discountType: row.discount_type as 'percentage' | 'fixed',
        discountValue: row.discount_value,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }
    } else {
      const row = codeResult.rows[0]
      if (!row) throw new Error('Referral code not found')
      referralCode = {
        code: row.code,
        shareUrl: row.share_url || `${process.env.NEXT_PUBLIC_STOREFRONT_URL || ''}/ref/${row.code}`,
        discountType: row.discount_type as 'percentage' | 'fixed',
        discountValue: row.discount_value,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }
    }

    // Get referral stats
    const statsResult = await sql<{
      total_invited: number
      total_signed_up: number
      total_converted: number
    }>`
      SELECT
        COUNT(*) as total_invited,
        COUNT(*) FILTER (WHERE status IN ('signed_up', 'converted')) as total_signed_up,
        COUNT(*) FILTER (WHERE status = 'converted') as total_converted
      FROM customer_referrals
      WHERE referrer_customer_id = ${session.customerId}
    `

    const statsRow = statsResult.rows[0]

    // Get total earned and pending rewards
    const rewardsStatsResult = await sql<{
      total_earned_cents: number
      pending_rewards_cents: number
    }>`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'credited'), 0) as total_earned_cents,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0) as pending_rewards_cents
      FROM customer_referral_rewards
      WHERE customer_id = ${session.customerId}
    `

    const rewardsStatsRow = rewardsStatsResult.rows[0]
    const totalInvited = Number(statsRow?.total_invited || 0)
    const totalConverted = Number(statsRow?.total_converted || 0)

    const stats: ReferralStats = {
      totalInvited,
      totalConverted,
      totalEarned: Number(rewardsStatsRow?.total_earned_cents || 0) / 100,
      pendingRewards: Number(rewardsStatsRow?.pending_rewards_cents || 0) / 100,
      currencyCode: 'USD',
      conversionRate: totalInvited > 0 ? (totalConverted / totalInvited) * 100 : 0,
    }

    // Get referral history
    const referralsResult = await sql<{
      id: string
      referred_email: string
      status: string
      invited_at: string
      converted_at: string | null
      first_order_total_cents: number | null
    }>`
      SELECT id, referred_email, status, invited_at, converted_at, first_order_total_cents
      FROM customer_referrals
      WHERE referrer_customer_id = ${session.customerId}
      ORDER BY invited_at DESC
      LIMIT 50
    `

    const referrals: Referral[] = referralsResult.rows.map((row) => ({
      id: row.id,
      email: maskEmail(row.referred_email),
      status: row.status as ReferralStatus,
      invitedAt: row.invited_at,
      convertedAt: row.converted_at,
      rewardEarned: row.first_order_total_cents ? row.first_order_total_cents / 100 * 0.1 : null,
      rewardCurrencyCode: 'USD',
    }))

    // Get rewards history
    const rewardsResult = await sql<{
      id: string
      reward_type: string
      amount_cents: number
      currency_code: string
      status: string
      referral_id: string
      earned_at: string
      credited_at: string | null
      expires_at: string | null
    }>`
      SELECT id, reward_type, amount_cents, currency_code, status, referral_id, earned_at, credited_at, expires_at
      FROM customer_referral_rewards
      WHERE customer_id = ${session.customerId}
      ORDER BY earned_at DESC
      LIMIT 50
    `

    const rewards: ReferralReward[] = rewardsResult.rows.map((row) => ({
      id: row.id,
      amount: row.amount_cents / 100,
      currencyCode: row.currency_code,
      type: row.reward_type as 'store_credit' | 'discount' | 'points',
      status: row.status as 'pending' | 'credited' | 'expired',
      referralId: row.referral_id,
      earnedAt: row.earned_at,
      creditedAt: row.credited_at,
      expiresAt: row.expires_at,
    }))

    return { code: referralCode, stats, referrals, rewards }
  })
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
    const result = await getReferralsData()
    if (!result) {
      throw new Error('Not authenticated')
    }
    data = result
  } catch {
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
