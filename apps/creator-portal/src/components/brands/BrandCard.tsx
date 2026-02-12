'use client'

import { Badge, Card, CardContent, formatCurrency } from '@cgk/ui'
import Link from 'next/link'
import { useCallback, useState } from 'react'

import type { BrandMembership } from '@/lib/types'

interface BrandCardProps {
  membership: BrandMembership
}

/**
 * Get initials from brand name for fallback avatar
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
 * Get badge variant based on membership status
 */
function getStatusVariant(status: BrandMembership['status']): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'paused':
      return 'secondary'
    case 'terminated':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * Get glow color based on status for card accent
 */
function getGlowColor(status: BrandMembership['status']): string {
  switch (status) {
    case 'active':
      return 'from-green-500/10 via-green-500/5'
    case 'pending':
      return 'from-amber-500/10 via-amber-500/5'
    case 'paused':
      return 'from-slate-500/10 via-slate-500/5'
    case 'terminated':
      return 'from-red-500/10 via-red-500/5'
    default:
      return 'from-slate-500/10 via-slate-500/5'
  }
}

/**
 * BrandCard - Displays a brand membership in a grid
 *
 * Features:
 * - Status-aware glow accent
 * - Prominent earnings display with monospace typography
 * - Discount code quick copy
 * - Projects count badge
 * - Commission rate display
 */
export function BrandCard({ membership }: BrandCardProps): React.JSX.Element {
  const [codeCopied, setCodeCopied] = useState(false)

  const handleCopyCode = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!membership.discountCode) return

      try {
        await navigator.clipboard.writeText(membership.discountCode)
        setCodeCopied(true)
        setTimeout(() => setCodeCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
    },
    [membership.discountCode]
  )

  const initials = getInitials(membership.brandName)
  const glowColor = getGlowColor(membership.status)

  return (
    <Link href={`/brands/${membership.brandSlug}`} className="group block">
      <Card className="relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        {/* Status glow accent - top border */}
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${glowColor} to-transparent transition-opacity group-hover:opacity-100`}
        />

        <CardContent className="p-5">
          {/* Header: Logo, name, status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Brand logo or initials */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
                {membership.brandLogo ? (
                  <img
                    src={membership.brandLogo}
                    alt={membership.brandName}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold text-muted-foreground">
                    {initials}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold leading-tight text-foreground group-hover:text-primary">
                  {membership.brandName}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  @{membership.brandSlug}
                </p>
              </div>
            </div>
            <Badge variant={getStatusVariant(membership.status)} className="shrink-0 capitalize">
              {membership.status}
            </Badge>
          </div>

          {/* Earnings section */}
          <div className="mt-5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Available
              </span>
              <span
                className={`font-mono text-xl font-bold tabular-nums ${
                  membership.balanceCents > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-foreground'
                }`}
              >
                {formatCurrency(membership.balanceCents / 100)}
              </span>
            </div>
            {membership.pendingCents > 0 && (
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Pending</span>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {formatCurrency(membership.pendingCents / 100)}
                </span>
              </div>
            )}
          </div>

          {/* Metrics row */}
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">
                  {membership.commissionPercent}%
                </span>
                <span className="text-xs text-muted-foreground">comm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">
                  {membership.activeProjectsCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  {membership.activeProjectsCount === 1 ? 'project' : 'projects'}
                </span>
              </div>
            </div>
          </div>

          {/* Discount code */}
          {membership.discountCode && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
                title="Click to copy discount code"
              >
                <code className="font-mono font-medium tracking-wide">
                  {membership.discountCode}
                </code>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {codeCopied ? (
                    <>
                      <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Contract warning */}
          {!membership.contractSigned && membership.status === 'active' && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <WarningIcon className="h-4 w-4 shrink-0" />
              <span>Contract pending signature</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

// Icon components
function CopyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  )
}
