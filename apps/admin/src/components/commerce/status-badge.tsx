/**
 * Commerce Status Badges
 *
 * These are thin wrappers around @cgk-platform/ui StatusBadge that provide
 * domain-specific status mappings for commerce entities.
 *
 * The StatusBadge component handles the visual styling consistently.
 * These components just provide the correct status prop.
 */

import { StatusBadge, type StatusBadgeProps } from '@cgk-platform/ui'

interface StatusBadgeWrapperProps extends Omit<StatusBadgeProps, 'status'> {
  status: string
}

// ============================================================================
// Order Statuses
// ============================================================================

export function OrderStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} showDot {...props} />
}

export function FulfillmentBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function FinancialBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Review Statuses
// ============================================================================

export function ReviewStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Creator Statuses
// ============================================================================

export function CreatorStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} showDot {...props} />
}

export function CreatorTierBadge({ tier, ...props }: { tier: string | null } & Omit<StatusBadgeProps, 'status'>) {
  if (!tier) return null

  // Custom styling for tiers (not semantic statuses)
  const tierVariants: Record<string, StatusBadgeProps['variant']> = {
    bronze: 'muted',
    silver: 'secondary',
    gold: 'warning',
    platinum: 'default',
  }

  return (
    <StatusBadge
      status={tier}
      variant={tierVariants[tier.toLowerCase()] || 'default'}
      {...props}
    />
  )
}

// ============================================================================
// Payment/Withdrawal Statuses
// ============================================================================

export function WithdrawalStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} showDot {...props} />
}

// ============================================================================
// Communication Statuses
// ============================================================================

export function ThreadStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Tax/Compliance Statuses
// ============================================================================

export function W9StatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function Form1099StatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Cart/Checkout Statuses
// ============================================================================

export function AbandonedCheckoutStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function DraftOrderStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Promotion Statuses
// ============================================================================

export function PromoCodeStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

export function PromoCodeTypeBadge({ type, ...props }: { type: string } & Omit<StatusBadgeProps, 'status'>) {
  // Type badges use info styling
  const typeLabels: Record<string, string> = {
    percentage: 'Percentage',
    fixed_amount: 'Fixed Amount',
    free_shipping: 'Free Shipping',
    buy_x_get_y: 'BXGY',
  }

  return (
    <StatusBadge
      status={type}
      label={typeLabels[type] || type}
      variant="info"
      {...props}
    />
  )
}

export function PromotionStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} {...props} />
}

// ============================================================================
// Subscription/Selling Plan Statuses
// ============================================================================

export function SubscriptionStatusBadge({ status, ...props }: StatusBadgeWrapperProps) {
  return <StatusBadge status={status} showDot {...props} />
}

export function SubscriptionFrequencyBadge({
  frequency,
  ...props
}: { frequency: string } & Omit<StatusBadgeProps, 'status'>) {
  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    bimonthly: 'Every 2 Months',
    quarterly: 'Quarterly',
    semiannually: 'Every 6 Months',
    annually: 'Annually',
  }

  return (
    <StatusBadge
      status={frequency}
      label={frequencyLabels[frequency] || frequency}
      variant="secondary"
      {...props}
    />
  )
}

export function SellingPlanStatusBadge({
  isActive,
  ...props
}: { isActive: boolean } & Omit<StatusBadgeProps, 'status'>) {
  return (
    <StatusBadge
      status={isActive ? 'active' : 'inactive'}
      {...props}
    />
  )
}

export function DiscountTypeBadge({ type, ...props }: { type: string } & Omit<StatusBadgeProps, 'status'>) {
  const typeLabels: Record<string, string> = {
    percentage: 'Percentage',
    fixed_amount: 'Fixed Amount',
    explicit_price: 'Fixed Price',
  }

  return (
    <StatusBadge
      status={type}
      label={typeLabels[type] || type}
      variant="info"
      {...props}
    />
  )
}
