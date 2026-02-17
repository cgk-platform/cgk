'use client'

/**
 * Rewards Page Client Components
 *
 * Client-side interactive components for the rewards page.
 */

import { cn } from '@cgk-platform/ui'
import { useState } from 'react'

import { getContent, loyaltyTierLabels, pointsTransactionLabels } from '@/lib/account/content'
import type {
  PortalContentStrings,
  LoyaltyAccount,
  LoyaltyTierInfo,
  PointsTransaction,
  LoyaltyReward,
} from '@/lib/account/types'

interface RewardsClientProps {
  data: {
    account: LoyaltyAccount
    tiers: LoyaltyTierInfo[]
    history: PointsTransaction[]
    rewards: LoyaltyReward[]
  }
  content: PortalContentStrings
}

export function RewardsClient({ data, content }: RewardsClientProps) {
  const { account, tiers, history, rewards } = data
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'how-to-earn'>('rewards')

  const currentTier = tiers.find((t) => t.tier === account.tier)
  const nextTier = tiers.find((t) => t.tier === account.nextTier)

  return (
    <div className="space-y-6">
      {/* Points Balance Card */}
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
              <pattern id="rewards-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#rewards-grid)" />
          </svg>
        </div>

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Points Balance */}
            <div>
              <p className="text-sm font-medium opacity-90">
                {getContent(content, 'loyalty.points_balance')}
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight">
                {account.currentPoints.toLocaleString()}
                <span className="ml-2 text-xl font-normal opacity-75">points</span>
              </p>
            </div>

            {/* Tier Status */}
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium opacity-90">
                {getContent(content, 'loyalty.tier_status')}
              </p>
              <div className="mt-1 flex items-center gap-2 sm:justify-end">
                <TierBadge tier={account.tier} />
                <span className="text-2xl font-bold">
                  {loyaltyTierLabels[account.tier] || account.tier}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {nextTier && account.pointsToNextTier !== null && (
            <div className="mt-6">
              <div className="h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${account.tierProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm opacity-75">
                <span>{loyaltyTierLabels[account.tier]}</span>
                <span>
                  {account.pointsToNextTier.toLocaleString()} points to {loyaltyTierLabels[nextTier.tier]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Decorative Icon */}
        <div className="absolute right-6 top-6 opacity-20">
          <StarIcon className="h-24 w-24" />
        </div>
      </section>

      {/* Tier Benefits */}
      {currentTier && (
        <section
          className={cn(
            'rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-6'
          )}
        >
          <h2 className="font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
            Your {loyaltyTierLabels[account.tier]} Benefits
          </h2>
          <ul className="mt-4 space-y-2">
            {currentTier.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckIcon className="h-4 w-4 text-green-500" />
                <span>{benefit}</span>
              </li>
            ))}
            {currentTier.multiplier > 1 && (
              <li className="flex items-center gap-2 text-sm">
                <CheckIcon className="h-4 w-4 text-green-500" />
                <span>{Math.round((currentTier.multiplier - 1) * 100)}% bonus points on all purchases</span>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[hsl(var(--portal-muted))] p-1">
        <TabButton
          active={activeTab === 'rewards'}
          onClick={() => setActiveTab('rewards')}
        >
          {getContent(content, 'loyalty.rewards.title')}
        </TabButton>
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          {getContent(content, 'loyalty.history.title')}
        </TabButton>
        <TabButton
          active={activeTab === 'how-to-earn'}
          onClick={() => setActiveTab('how-to-earn')}
        >
          How to Earn
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'rewards' && (
        <RewardsGrid
          rewards={rewards}
          currentPoints={account.currentPoints}
          content={content}
        />
      )}

      {activeTab === 'history' && (
        <PointsHistory history={history} />
      )}

      {activeTab === 'how-to-earn' && (
        <HowToEarn tiers={tiers} />
      )}
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-[hsl(var(--portal-card))] text-[hsl(var(--portal-foreground))] shadow-sm'
          : 'text-[hsl(var(--portal-muted-foreground))] hover:text-[hsl(var(--portal-foreground))]'
      )}
    >
      {children}
    </button>
  )
}

interface RewardsGridProps {
  rewards: LoyaltyReward[]
  currentPoints: number
  content: PortalContentStrings
}

function RewardsGrid({ rewards, currentPoints, content }: RewardsGridProps) {
  if (rewards.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl',
          'border border-dashed border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-muted))]/30 px-8 py-16 text-center'
        )}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]">
          <GiftIcon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold">No rewards available</h3>
        <p className="mt-2 max-w-sm text-sm text-[hsl(var(--portal-muted-foreground))]">
          Keep earning points to unlock rewards! Check back soon for new offers.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rewards.map((reward) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          currentPoints={currentPoints}
          content={content}
        />
      ))}
    </div>
  )
}

interface RewardCardProps {
  reward: LoyaltyReward
  currentPoints: number
  content: PortalContentStrings
}

function RewardCard({ reward, currentPoints, content }: RewardCardProps) {
  const canRedeem = currentPoints >= reward.pointsCost

  const typeIcons: Record<string, React.ReactNode> = {
    discount: <TagIcon className="h-8 w-8" />,
    free_product: <GiftIcon className="h-8 w-8" />,
    free_shipping: <TruckIcon className="h-8 w-8" />,
    exclusive_access: <SparklesIcon className="h-8 w-8" />,
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] p-4 transition-all',
        canRedeem && 'hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {/* Reward Icon */}
      <div className="flex h-20 items-center justify-center rounded-lg bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]">
        {typeIcons[reward.type] || <GiftIcon className="h-8 w-8" />}
      </div>

      {/* Reward Details */}
      <div className="mt-4">
        <h3 className="font-semibold">{reward.name}</h3>
        <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
          {reward.description}
        </p>
      </div>

      {/* Points Cost */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium">
          {reward.pointsCost.toLocaleString()} points
        </span>
        {!canRedeem && (
          <span className="text-xs text-[hsl(var(--portal-muted-foreground))]">
            Need {(reward.pointsCost - currentPoints).toLocaleString()} more
          </span>
        )}
      </div>

      {/* Redeem Button */}
      <button
        disabled={!canRedeem}
        className={cn(
          'mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          canRedeem
            ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))] hover:opacity-90'
            : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))] cursor-not-allowed'
        )}
      >
        {canRedeem
          ? getContent(content, 'loyalty.rewards.redeem')
          : getContent(content, 'loyalty.rewards.not_enough_points')}
      </button>
    </div>
  )
}

interface PointsHistoryProps {
  history: PointsTransaction[]
}

function PointsHistory({ history }: PointsHistoryProps) {
  if (history.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl',
          'border border-dashed border-[hsl(var(--portal-border))]',
          'bg-[hsl(var(--portal-muted))]/30 px-8 py-16 text-center'
        )}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))]">
          <ClockIcon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold">No points activity yet</h3>
        <p className="mt-2 max-w-sm text-sm text-[hsl(var(--portal-muted-foreground))]">
          Start earning points by making a purchase or leaving a review!
        </p>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'rounded-xl border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))] overflow-hidden'
      )}
    >
      <div className="divide-y divide-[hsl(var(--portal-border))]">
        {history.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </section>
  )
}

interface TransactionRowProps {
  transaction: PointsTransaction
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isEarned = transaction.points > 0
  const typeLabel = pointsTransactionLabels[transaction.type] || transaction.type

  const typeConfig = getTransactionTypeConfig(transaction.type)

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--portal-muted))]/30 transition-colors">
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          typeConfig.bgColor
        )}
      >
        <span className={typeConfig.iconColor}>{typeConfig.icon}</span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{typeLabel}</p>
        <p className="mt-0.5 truncate text-sm text-[hsl(var(--portal-muted-foreground))]">
          {transaction.description}
        </p>
        <p className="mt-0.5 text-xs text-[hsl(var(--portal-muted-foreground))]">
          {new Date(transaction.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Points */}
      <div className="text-right">
        <p
          className={cn(
            'font-semibold',
            isEarned ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isEarned ? '+' : ''}{transaction.points.toLocaleString()}
        </p>
        <p className="text-xs text-[hsl(var(--portal-muted-foreground))]">points</p>
      </div>
    </div>
  )
}

function getTransactionTypeConfig(type: string) {
  switch (type) {
    case 'earned_purchase':
      return {
        icon: <CartIcon className="h-5 w-5" />,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
      }
    case 'earned_review':
      return {
        icon: <StarIcon className="h-5 w-5" />,
        bgColor: 'bg-amber-100',
        iconColor: 'text-amber-600',
      }
    case 'earned_referral':
      return {
        icon: <UsersIcon className="h-5 w-5" />,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      }
    case 'earned_birthday':
      return {
        icon: <CakeIcon className="h-5 w-5" />,
        bgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
      }
    case 'earned_signup':
      return {
        icon: <GiftIcon className="h-5 w-5" />,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
      }
    case 'redeemed':
      return {
        icon: <TagIcon className="h-5 w-5" />,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      }
    case 'expired':
      return {
        icon: <ClockIcon className="h-5 w-5" />,
        bgColor: 'bg-stone-100',
        iconColor: 'text-stone-500',
      }
    default:
      return {
        icon: <SparklesIcon className="h-5 w-5" />,
        bgColor: 'bg-slate-100',
        iconColor: 'text-slate-600',
      }
  }
}

interface HowToEarnProps {
  tiers: LoyaltyTierInfo[]
}

function HowToEarn({ tiers }: HowToEarnProps) {
  const earnMethods = [
    {
      icon: <CartIcon className="h-8 w-8" />,
      title: 'Make a Purchase',
      description: 'Earn 1 point for every $1 spent',
      highlight: 'Up to 1.5x with higher tiers!',
    },
    {
      icon: <StarIcon className="h-8 w-8" />,
      title: 'Write a Review',
      description: 'Share your thoughts and earn 50 points',
      highlight: 'Photo reviews earn 100 points!',
    },
    {
      icon: <UsersIcon className="h-8 w-8" />,
      title: 'Refer a Friend',
      description: 'Get 500 points when they make their first purchase',
      highlight: 'Plus they get 10% off!',
    },
    {
      icon: <CakeIcon className="h-8 w-8" />,
      title: 'Birthday Bonus',
      description: 'Receive 200 bonus points on your birthday',
      highlight: 'Add your birthday in profile settings',
    },
    {
      icon: <GiftIcon className="h-8 w-8" />,
      title: 'Join Today',
      description: 'Get 100 welcome points just for signing up',
      highlight: 'Already enrolled!',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Earning Methods */}
      <section>
        <h3 className="mb-4 font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
          Ways to Earn Points
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {earnMethods.map((method, index) => (
            <div
              key={index}
              className={cn(
                'rounded-xl border border-[hsl(var(--portal-border))]',
                'bg-[hsl(var(--portal-card))] p-4'
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]">
                {method.icon}
              </div>
              <h4 className="mt-3 font-semibold">{method.title}</h4>
              <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                {method.description}
              </p>
              <p className="mt-2 text-xs font-medium text-[hsl(var(--portal-primary))]">
                {method.highlight}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier Overview */}
      <section>
        <h3 className="mb-4 font-semibold" style={{ fontFamily: 'var(--portal-heading-font)' }}>
          Membership Tiers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[hsl(var(--portal-border))]">
                <th className="pb-3 text-left text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
                  Tier
                </th>
                <th className="pb-3 text-left text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
                  Points Required
                </th>
                <th className="pb-3 text-left text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
                  Multiplier
                </th>
                <th className="pb-3 text-left text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
                  Benefits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--portal-border))]">
              {tiers.map((tier) => (
                <tr key={tier.tier}>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <TierBadge tier={tier.tier} size="sm" />
                      <span className="font-medium">{tier.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm">
                    {tier.minPoints.toLocaleString()}
                    {tier.maxPoints ? ` - ${tier.maxPoints.toLocaleString()}` : '+'}
                  </td>
                  <td className="py-4 text-sm">
                    {tier.multiplier}x points
                  </td>
                  <td className="py-4 text-sm">
                    <ul className="space-y-0.5">
                      {tier.benefits.slice(0, 2).map((benefit, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <CheckIcon className="h-3 w-3 text-green-500" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                      {tier.benefits.length > 2 && (
                        <li className="text-[hsl(var(--portal-muted-foreground))]">
                          +{tier.benefits.length - 2} more
                        </li>
                      )}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

interface TierBadgeProps {
  tier: string
  size?: 'sm' | 'md'
}

function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const tierColors: Record<string, string> = {
    bronze: 'from-amber-600 to-amber-700',
    silver: 'from-slate-400 to-slate-500',
    gold: 'from-yellow-400 to-yellow-500',
    platinum: 'from-slate-600 to-slate-800',
  }

  const sizeClasses = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        'bg-gradient-to-br',
        tierColors[tier] || 'from-slate-400 to-slate-500',
        sizeClasses
      )}
    >
      <ShieldIcon className={cn('text-white', size === 'sm' ? 'h-3 w-3' : 'h-5 w-5')} />
    </div>
  )
}

// Icons
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
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

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
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

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  )
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}
