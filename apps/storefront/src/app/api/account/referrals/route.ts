export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type {
  ReferralCode,
  ReferralStats,
  Referral,
  ReferralReward,
  ReferralStatus,
} from '@/lib/account/types'

/**
 * GET /api/account/referrals
 * Returns the customer's referral code, stats, history, and rewards
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
    // Get or create referral code for customer
    let codeResult = await sql<{
      id: string
      code: string
      share_url: string | null
      discount_type: string
      discount_value: number
      created_at: string
      expires_at: string | null
    }>`
      SELECT
        id,
        code,
        share_url,
        discount_type,
        discount_value,
        created_at,
        expires_at
      FROM customer_referral_codes
      WHERE customer_id = ${session.customerId}
        AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `

    let referralCode: ReferralCode

    if (codeResult.rows.length === 0) {
      // Generate a new referral code
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
          customer_id,
          code,
          share_url,
          discount_type,
          discount_value
        ) VALUES (
          ${session.customerId},
          ${newCode},
          ${shareUrl},
          'percentage',
          10
        )
        RETURNING id, code, share_url, discount_type, discount_value, created_at, expires_at
      `

      const row = insertResult.rows[0]
      if (!row) {
        throw new Error('Failed to create referral code')
      }

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
      if (!row) {
        throw new Error('Referral code not found')
      }
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
      SELECT
        id,
        referred_email,
        status,
        invited_at,
        converted_at,
        first_order_total_cents
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
      SELECT
        id,
        reward_type,
        amount_cents,
        currency_code,
        status,
        referral_id,
        earned_at,
        credited_at,
        expires_at
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

    return {
      code: referralCode,
      stats,
      referrals,
      rewards,
    }
  })

  return NextResponse.json(data)
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(customerId: string): string {
  const prefix = customerId.slice(-4).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${random}`
}

/**
 * Mask email for privacy (show first 2 chars and domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '****@****'
  const maskedLocal = local.slice(0, 2) + '***'
  return `${maskedLocal}@${domain}`
}
