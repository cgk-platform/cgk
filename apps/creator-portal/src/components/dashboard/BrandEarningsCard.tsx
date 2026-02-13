'use client'

import { Badge, Button, Card, CardContent, CardHeader } from '@cgk-platform/ui'

interface BrandEarningsCardProps {
  brandId: string
  brandName: string
  brandSlug: string
  brandLogo?: string | null
  status: 'active' | 'paused' | 'terminated' | 'pending'
  commissionPercent: number
  discountCode: string | null
  balanceCents: number
  pendingCents: number
  activeProjectsCount: number
  contractSigned: boolean
  onViewDetails?: () => void
  onWithdraw?: () => void
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Get initials from brand name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'paused':
      return 'secondary'
    case 'terminated':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function BrandEarningsCard({
  brandId: _brandId,
  brandName,
  brandSlug,
  brandLogo,
  status,
  commissionPercent,
  discountCode,
  balanceCents,
  pendingCents,
  activeProjectsCount,
  contractSigned,
  onViewDetails,
  onWithdraw,
}: BrandEarningsCardProps): React.JSX.Element {
  // brandId is passed for potential future use (analytics, etc.)
  void _brandId
  const hasWithdrawableBalance = balanceCents >= 1000 // $10 minimum
  const initials = getInitials(brandName)

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Brand color accent - subtle gradient on hover */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 to-primary/20" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Brand logo or initials */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <span className="text-muted-foreground">{initials}</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold leading-none">{brandName}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">@{brandSlug}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant(status)} className="capitalize">
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance section */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span
              className={`text-xl font-bold ${balanceCents > 0 ? 'text-green-600 dark:text-green-500' : ''}`}
            >
              {formatCurrency(balanceCents)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground" title="Earnings waiting for approval or processing">
              Pending
            </span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(pendingCents)}
            </span>
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">{commissionPercent}%</span>
              <span className="ml-1 text-xs text-muted-foreground">commission</span>
            </div>
            <div>
              <span className="font-medium">{activeProjectsCount}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                {activeProjectsCount === 1 ? 'project' : 'projects'}
              </span>
            </div>
          </div>
          {discountCode && (
            <div className="flex items-center gap-1">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{discountCode}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(discountCode)}
                className="text-muted-foreground hover:text-foreground"
                title="Copy discount code"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Contract warning */}
        {!contractSigned && status === 'active' && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
            Contract pending signature
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onViewDetails}
          >
            View Details
          </Button>
          {hasWithdrawableBalance && status === 'active' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onWithdraw}
            >
              Withdraw
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
