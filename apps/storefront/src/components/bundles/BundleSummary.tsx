/**
 * Bundle Summary & Tier Progress
 *
 * Displays the tier progress bar, savings callout, price summary,
 * and the CTA button for the bundle builder.
 */

'use client'

import { cn } from '@cgk-platform/ui'

import type { BundleTier } from './types'

interface BundleSummaryProps {
  totalItems: number
  subtotal: number
  discountAmount: number
  total: number
  activeTier: BundleTier | null
  tierBadgeText: string | null
  tierProgress: { percent: number; label: string; hint: string }
  sortedTiers: BundleTier[]
  showTierProgress: boolean
  showSavings: boolean
  ctaLabel: string
  buttonState: 'idle' | 'loading' | 'success' | 'error'
  canAddToCart: boolean
  currencyCode: string
  onAddToCart: () => void
}

export function BundleSummary({
  totalItems,
  subtotal,
  discountAmount,
  total,
  tierBadgeText,
  tierProgress,
  sortedTiers,
  showTierProgress,
  showSavings,
  ctaLabel,
  buttonState,
  canAddToCart,
  currencyCode,
  onAddToCart,
}: BundleSummaryProps) {
  return (
    <>
      {/* Tier progress bar */}
      {showTierProgress && sortedTiers.length > 0 && (
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-cgk-navy">{tierProgress.label}</span>
            {tierProgress.hint && (
              <span className="text-xs text-gray-500">{tierProgress.hint}</span>
            )}
          </div>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-cgk-cream"
            role="progressbar"
            aria-valuenow={Math.round(tierProgress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Discount tier progress"
          >
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out',
                tierProgress.percent >= 100 ? 'bg-cgk-gold' : 'bg-cgk-navy'
              )}
              style={{ width: `${tierProgress.percent}%` }}
            />
          </div>
          <div className="relative flex justify-between px-0.5">
            {sortedTiers.map((tier, idx) => {
              const isUnlocked = totalItems >= tier.count
              return (
                <div key={`${tier.count}-${idx}`} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors duration-300',
                      isUnlocked ? 'bg-cgk-gold' : 'bg-gray-300'
                    )}
                  />
                  <span
                    className={cn(
                      'mt-1 text-[10px] font-medium',
                      isUnlocked ? 'text-cgk-navy' : 'text-gray-400'
                    )}
                  >
                    {tier.count}+
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Savings callout */}
      {showSavings && discountAmount > 0 && (
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cgk-gold/15 px-4 py-2 text-sm font-bold text-cgk-gold">
            <CheckIcon className="h-4 w-4" />
            You save {formatMoney(discountAmount, currencyCode)}!
          </span>
        </div>
      )}

      {/* Price summary */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5" aria-live="polite">
        <div className="space-y-2.5 text-sm">
          <SummaryRow label="Items selected">
            <span className="font-semibold text-cgk-navy">{totalItems}</span>
          </SummaryRow>

          {tierBadgeText && (
            <SummaryRow label="Active tier">
              <span className="rounded-md bg-cgk-navy/10 px-2 py-0.5 text-xs font-semibold text-cgk-navy">
                {tierBadgeText}
              </span>
            </SummaryRow>
          )}

          <SummaryRow label="Subtotal">
            <span>{formatMoney(subtotal, currencyCode)}</span>
          </SummaryRow>

          {discountAmount > 0 && (
            <div className="flex justify-between text-cgk-gold">
              <span>Bundle discount</span>
              <span className="font-semibold">-{formatMoney(discountAmount, currencyCode)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-100 pt-2.5 text-base font-bold text-cgk-navy">
            <span>Total</span>
            <span>{formatMoney(total, currencyCode)}</span>
          </div>
        </div>
      </div>

      {/* CTA button */}
      <button
        type="button"
        className={cn(
          'mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgk-navy focus-visible:ring-offset-2',
          buttonState === 'idle' && canAddToCart && [
            'bg-cgk-navy text-white',
            'hover:bg-cgk-navy/90 hover:shadow-lg',
            'active:scale-[0.98]',
          ],
          buttonState === 'idle' && !canAddToCart && 'cursor-not-allowed bg-gray-200 text-gray-400',
          buttonState === 'loading' && 'cursor-wait bg-cgk-navy/80 text-white',
          buttonState === 'success' && 'bg-emerald-600 text-white shadow-lg',
          buttonState === 'error' && 'bg-red-600 text-white hover:bg-red-700'
        )}
        disabled={(!canAddToCart && buttonState === 'idle') || buttonState === 'loading'}
        onClick={onAddToCart}
      >
        {buttonState === 'loading' && <SpinnerIcon />}
        {buttonState === 'success' && <CheckIcon className="h-5 w-5" />}
        {ctaLabel}
      </button>
    </>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      {children}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function formatMoney(cents: number, currencyCode: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(cents / 100)
}
