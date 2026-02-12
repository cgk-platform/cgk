/**
 * Status Badge Component
 *
 * Displays order, return, and ticket status with appropriate colors.
 */

import { cn } from '@cgk/ui'

type StatusType =
  | 'order'
  | 'return'
  | 'ticket'
  | 'referral'
  | 'loyalty'
  | 'points'

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'shipped'
  | 'received'
  | 'refunded'

type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed'

type ReferralStatus = 'pending' | 'converted' | 'expired' | 'cancelled'

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

type PointsType =
  | 'earned_purchase'
  | 'earned_review'
  | 'earned_referral'
  | 'earned_birthday'
  | 'earned_signup'
  | 'redeemed'
  | 'expired'
  | 'adjusted'

interface StatusBadgeProps {
  type: StatusType
  status: string
  className?: string
}

const statusConfig: Record<
  StatusType,
  Record<string, { bg: string; text: string; dot: string }>
> = {
  order: {
    pending: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-400' },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    processing: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    shipped: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    delivered: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    refunded: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
    },
  },
  return: {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    shipped: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    received: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    refunded: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
    },
  },
  ticket: {
    open: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    waiting_customer: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
    },
    resolved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    closed: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-400' },
  },
  referral: {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    converted: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    expired: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-400' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  },
  loyalty: {
    bronze: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
    },
    silver: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
    gold: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    platinum: {
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      dot: 'bg-violet-500',
    },
  },
  points: {
    earned_purchase: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    earned_review: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    earned_referral: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    earned_birthday: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      dot: 'bg-pink-500',
    },
    earned_signup: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    redeemed: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
    },
    expired: { bg: 'bg-stone-100', text: 'text-stone-700', dot: 'bg-stone-400' },
    adjusted: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  },
}

const statusLabels: Record<StatusType, Record<string, string>> = {
  order: {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  },
  return: {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    shipped: 'Return Shipped',
    received: 'Received',
    refunded: 'Refunded',
  },
  ticket: {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_customer: 'Awaiting Response',
    resolved: 'Resolved',
    closed: 'Closed',
  },
  referral: {
    pending: 'Pending',
    converted: 'Converted',
    expired: 'Expired',
    cancelled: 'Cancelled',
  },
  loyalty: {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  },
  points: {
    earned_purchase: 'Purchase',
    earned_review: 'Review',
    earned_referral: 'Referral',
    earned_birthday: 'Birthday Bonus',
    earned_signup: 'Welcome Bonus',
    redeemed: 'Redeemed',
    expired: 'Expired',
    adjusted: 'Adjustment',
  },
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const config = statusConfig[type]?.[status] ?? {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    dot: 'bg-stone-400',
  }
  const label = statusLabels[type]?.[status] ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {label}
    </span>
  )
}
