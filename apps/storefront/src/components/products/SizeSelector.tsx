/**
 * SizeSelector Component
 *
 * Card-based size selector for SleepSaver product
 * Matches Figma design specifications with responsive layout
 *
 * Desktop: 3 cards side-by-side (264px each, 10px gap)
 * Mobile: 3 cards side-by-side (narrower, 8px gap, horizontal scroll)
 */

'use client'

import { cn } from '@cgk-platform/ui'

interface SizeVariant {
  id: string
  title: string // "Twin Size", "Full Size", "Queen Size"
  dimensions: string // "35\" x 64\"", "35\" x 80\"", "60\" x 80\""
  price: {
    amount: string
    currencyCode: string
  }
  compareAtPrice?: {
    amount: string
    currencyCode: string
  }
}

interface SizeSelectorProps {
  variants: SizeVariant[]
  selectedVariantId?: string
  onSelectVariant: (variantId: string) => void
  className?: string
}

export function SizeSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  className,
}: SizeSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: 3 cards side-by-side */}
      {/* Mobile: Horizontal scroll if needed */}
      <div className="grid grid-cols-3 gap-2 md:gap-2.5">
        {variants.map((variant) => (
          <SizeCard
            key={variant.id}
            variant={variant}
            isSelected={selectedVariantId === variant.id}
            onClick={() => onSelectVariant(variant.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface SizeCardProps {
  variant: SizeVariant
  isSelected: boolean
  onClick: () => void
}

function SizeCard({ variant, isSelected, onClick }: SizeCardProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: variant.price.currencyCode,
    minimumFractionDigits: 2,
  })

  const currentPrice = parseFloat(variant.price.amount)
  const compareAtPrice = variant.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : null

  // Calculate savings in dollars
  const savingsAmount =
    compareAtPrice && compareAtPrice > currentPrice ? compareAtPrice - currentPrice : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-lg border bg-white p-3 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-meliusly-primary focus-visible:ring-offset-2 md:p-4',
        isSelected
          ? 'border-2 border-meliusly-primary bg-meliusly-light-blue'
          : 'border border-[rgba(34,34,34,0.1)] hover:border-[rgba(34,34,34,0.2)]'
      )}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${variant.title} - ${variant.dimensions} - ${formatter.format(currentPrice)}`}
    >
      {/* Size name */}
      <div className="mb-1 font-manrope text-[13px] font-medium leading-tight text-meliusly-dark md:text-[15px]">
        {variant.title}
      </div>

      {/* Dimensions */}
      <div className="mb-2 font-manrope text-[11px] leading-tight text-meliusly-dark-gray md:mb-3 md:text-[13px]">
        {variant.dimensions}
      </div>

      {/* Pricing */}
      <div className="mt-auto flex flex-col gap-1">
        {/* Compare-at price (strikethrough) */}
        {compareAtPrice && (
          <div className="font-manrope text-[12px] leading-tight text-meliusly-dark-gray line-through md:text-[14px]">
            {formatter.format(compareAtPrice)}
          </div>
        )}

        {/* Current price */}
        <div className="font-manrope text-[14px] font-semibold leading-tight text-meliusly-dark md:text-[16px]">
          {formatter.format(currentPrice)}
        </div>

        {/* Savings badge */}
        {savingsAmount && savingsAmount > 0 && (
          <div className="mt-1 inline-flex w-fit items-center rounded-xl bg-meliusly-primary px-2 py-1 font-manrope text-[9px] font-bold uppercase tracking-wide text-white md:text-[10px]">
            SAVE ${savingsAmount.toFixed(0)}
          </div>
        )}
      </div>
    </button>
  )
}

export default SizeSelector
