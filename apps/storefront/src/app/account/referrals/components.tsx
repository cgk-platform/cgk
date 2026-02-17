'use client'

/**
 * Referrals Page Client Components
 *
 * Client-side interactive components for the referrals page.
 */

import { cn, formatCurrency } from '@cgk-platform/ui'
import { useState } from 'react'
import Link from 'next/link'

import { getContent } from '@/lib/account/content'
import type { PortalContentStrings, ReferralCode, ReferralStats, Referral, ReferralReward } from '@/lib/account/types'

interface ReferralsClientProps {
  data: {
    code: ReferralCode
    stats: ReferralStats
    referrals: Referral[]
    rewards: ReferralReward[]
  }
  content: PortalContentStrings
}

export function ReferralsClient({ data, content }: ReferralsClientProps) {
  const { code, stats, referrals, rewards } = data
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (!code.code) return

    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code.code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareOnTwitter = () => {
    const text = `Get ${code.discountValue}${code.discountType === 'percentage' ? '%' : ' dollars'} off your first order!`
    const url = encodeURIComponent(code.shareUrl)
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank')
  }

  const shareOnFacebook = () => {
    const url = encodeURIComponent(code.shareUrl)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Check out this great deal!')
    const body = encodeURIComponent(
      `I wanted to share this with you! Use my referral code ${code.code} to get ${code.discountValue}${code.discountType === 'percentage' ? '%' : ' dollars'} off your first order.\n\n${code.shareUrl}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // Empty state
  if (!code.code) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl',
          'border border-dashed border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-muted))]/30 px-8 py-16 text-center'
        )}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]">
          <UsersIcon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold">Referral program coming soon</h3>
        <p className="mt-2 max-w-sm text-sm text-[hsl(var(--portal-muted-foreground))]">
          Stay tuned! We are working on our referral program and you will be able to earn rewards soon.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <section
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/80',
          'p-8 text-[hsl(var(--portal-primary-foreground))]'
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="referral-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#referral-grid)" />
          </svg>
        </div>

        <div className="relative space-y-4">
          <p className="text-sm font-medium opacity-90">
            {getContent(content, 'referrals.your_code')}
          </p>

          {/* Referral Code Display */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/10 px-6 py-4 font-mono text-2xl font-bold tracking-wider">
              {code.code}
            </div>
            <button
              onClick={copyToClipboard}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-3',
                'bg-white/20 hover:bg-white/30 transition-colors',
                'text-sm font-medium'
              )}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  {getContent(content, 'referrals.copy_code')}
                </>
              )}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-75">{getContent(content, 'referrals.share_via')}:</span>
            <div className="flex gap-2">
              <button
                onClick={shareOnTwitter}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Share on Twitter"
              >
                <TwitterIcon className="h-5 w-5" />
              </button>
              <button
                onClick={shareOnFacebook}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Share on Facebook"
              >
                <FacebookIcon className="h-5 w-5" />
              </button>
              <button
                onClick={shareViaEmail}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Share via Email"
              >
                <MailIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Discount Info */}
          <p className="text-sm opacity-75">
            Your friends get{' '}
            <strong>
              {code.discountValue}
              {code.discountType === 'percentage' ? '%' : ' dollars'} off
            </strong>{' '}
            their first order, and you earn rewards when they make a purchase.
          </p>
        </div>

        {/* Decorative Icon */}
        <div className="absolute right-6 top-6 opacity-20">
          <GiftIcon className="h-24 w-24" />
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={getContent(content, 'referrals.stats.invited')}
          value={stats.totalInvited.toString()}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label={getContent(content, 'referrals.stats.converted')}
          value={stats.totalConverted.toString()}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          label={getContent(content, 'referrals.stats.earned')}
          value={formatCurrency(stats.totalEarned, stats.currencyCode)}
          icon={<DollarIcon className="h-5 w-5" />}
          variant="gold"
        />
      </div>

      {/* Pending Rewards Banner */}
      {stats.pendingRewards > 0 && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border border-amber-200',
            'bg-amber-50 px-4 py-3 text-amber-800'
          )}
        >
          <ClockIcon className="h-5 w-5 text-amber-500" />
          <span className="text-sm">
            <strong>{formatCurrency(stats.pendingRewards, stats.currencyCode)}</strong> in pending
            rewards will be credited once your referrals complete their first purchase.
          </span>
        </div>
      )}

      {/* Referral History */}
      <section
        className={cn(
          'rounded-xl border border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-card))] overflow-hidden'
        )}
      >
        <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
          <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
            {getContent(content, 'referrals.history.title')}
          </h2>
        </div>

        {referrals.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
            {getContent(content, 'referrals.history.empty')}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--portal-border))]">
            {referrals.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} />
            ))}
          </div>
        )}
      </section>

      {/* Rewards History */}
      {rewards.length > 0 && (
        <section
          className={cn(
            'rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] overflow-hidden'
          )}
        >
          <div className="border-b border-[hsl(var(--portal-border))] px-6 py-4">
            <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
              Rewards Earned
            </h2>
          </div>

          <div className="divide-y divide-[hsl(var(--portal-border))]">
            {rewards.map((reward) => (
              <RewardRow key={reward.id} reward={reward} />
            ))}
          </div>
        </section>
      )}

      {/* Terms Link */}
      <div className="text-center">
        <Link
          href="/pages/referral-terms"
          className="text-sm text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))] transition-colors"
        >
          View referral program terms and conditions
        </Link>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'gold'
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-[hsl(var(--portal-muted-foreground))]',
    success: 'text-green-600',
    gold: 'text-amber-600',
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] p-6'
      )}
    >
      <div className={cn('flex items-center gap-2', variantStyles[variant])}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

interface ReferralRowProps {
  referral: Referral
}

function ReferralRow({ referral }: ReferralRowProps) {
  const statusConfig = getReferralStatusConfig(referral.status)

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--portal-muted))]/30 transition-colors">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          statusConfig.bgColor
        )}
      >
        <span className={statusConfig.iconColor}>{statusConfig.icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium">{referral.email}</p>
        <p className="mt-0.5 text-sm text-[hsl(var(--portal-muted-foreground))]">
          Invited{' '}
          {new Date(referral.invitedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="text-right">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusConfig.badgeBg,
            statusConfig.badgeText
          )}
        >
          {statusConfig.label}
        </span>
        {referral.rewardEarned && referral.status === 'converted' && (
          <p className="mt-1 text-sm font-medium text-green-600">
            +{formatCurrency(referral.rewardEarned, referral.rewardCurrencyCode)}
          </p>
        )}
      </div>
    </div>
  )
}

function getReferralStatusConfig(status: string) {
  switch (status) {
    case 'converted':
      return {
        label: 'Converted',
        icon: <CheckIcon className="h-5 w-5" />,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700',
      }
    case 'signed_up':
      return {
        label: 'Signed Up',
        icon: <UserPlusIcon className="h-5 w-5" />,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
      }
    case 'expired':
      return {
        label: 'Expired',
        icon: <ClockIcon className="h-5 w-5" />,
        bgColor: 'bg-stone-100',
        iconColor: 'text-stone-500',
        badgeBg: 'bg-stone-100',
        badgeText: 'text-stone-600',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: <XIcon className="h-5 w-5" />,
        bgColor: 'bg-red-100',
        iconColor: 'text-red-500',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700',
      }
    default:
      return {
        label: 'Pending',
        icon: <MailIcon className="h-5 w-5" />,
        bgColor: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
      }
  }
}

interface RewardRowProps {
  reward: ReferralReward
}

function RewardRow({ reward }: RewardRowProps) {
  const typeLabels: Record<string, string> = {
    store_credit: 'Store Credit',
    discount: 'Discount',
    points: 'Bonus Points',
  }

  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
    credited: { label: 'Credited', className: 'bg-green-100 text-green-700' },
    expired: { label: 'Expired', className: 'bg-stone-100 text-stone-600' },
  }

  const config = statusConfig[reward.status]

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--portal-muted))]/30 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
        <GiftIcon className="h-5 w-5 text-green-600" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium">{typeLabels[reward.type] || reward.type}</p>
        <p className="mt-0.5 text-sm text-[hsl(var(--portal-muted-foreground))]">
          Earned{' '}
          {new Date(reward.earnedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="text-right">
        <p className="font-semibold text-green-600">
          +{formatCurrency(reward.amount, reward.currencyCode)}
        </p>
        <span
          className={cn(
            'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            config.className
          )}
        >
          {config.label}
        </span>
      </div>
    </div>
  )
}

// Icons
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
