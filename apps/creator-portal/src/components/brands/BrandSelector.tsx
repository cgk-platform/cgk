/**
 * Brand Selector Component
 *
 * Dropdown for selecting which brand to filter dashboard data by.
 * Shows current selection and allows switching between brands or viewing all.
 */
'use client'

import * as React from 'react'
import { Building2, Check, ChevronDown, Layers } from 'lucide-react'

import { cn, formatCurrency } from '@cgk-platform/ui'

import { useBrand, type BrandInfo } from '@/lib/brand-context'

interface BrandSelectorProps {
  /** Visual variant */
  variant?: 'default' | 'compact'
  /** Additional class names */
  className?: string
  /** Show balance in dropdown items */
  showBalance?: boolean
}

/**
 * Brand logo with fallback initials
 */
function BrandLogo({
  brand,
  size = 'md',
  className,
}: {
  brand: BrandInfo | null
  size?: 'sm' | 'md'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
  }

  if (!brand) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-primary/10 text-primary',
          sizeClasses[size],
          className
        )}
      >
        <Layers className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </div>
    )
  }

  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        className={cn('rounded-md object-cover', sizeClasses[size], className)}
      />
    )
  }

  // Fallback to initials
  const initials = brand.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}

/**
 * Brand Selector Dropdown
 */
export function BrandSelector({
  variant = 'default',
  className,
  showBalance = true,
}: BrandSelectorProps) {
  const {
    selectedBrand,
    availableBrands,
    isSwitching,
    hasMultipleBrands,
    selectBrand,
  } = useBrand()

  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelect = (brandSlug: string | null) => {
    selectBrand(brandSlug)
    setIsOpen(false)
  }

  // If only one brand, don't show switcher - just show the brand name
  if (!hasMultipleBrands && availableBrands.length === 1) {
    const singleBrand = availableBrands[0]
    if (!singleBrand) return null
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <BrandLogo brand={singleBrand} size={variant === 'compact' ? 'sm' : 'md'} />
        <span className="text-sm font-medium">{singleBrand.name}</span>
      </div>
    )
  }

  // No brands at all
  if (availableBrands.length === 0) {
    return null
  }

  const displayName = selectedBrand ? selectedBrand.name : 'All Brands'

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors',
          'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'compact' && 'px-2 py-1.5'
        )}
        aria-label="Select brand"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <BrandLogo brand={selectedBrand} size={variant === 'compact' ? 'sm' : 'md'} />
        <div className={cn('flex flex-col', variant === 'compact' && 'hidden sm:flex')}>
          <span className="text-sm font-medium leading-tight">{displayName}</span>
          {variant !== 'compact' && selectedBrand && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(selectedBrand.balanceCents / 100)} available
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="listbox"
          aria-label="Available brands"
        >
          {/* All Brands option */}
          <div className="border-b p-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                'hover:bg-accent focus:bg-accent focus:outline-none',
                !selectedBrand && 'bg-accent'
              )}
              role="option"
              aria-selected={!selectedBrand}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">All Brands</span>
                <p className="text-xs text-muted-foreground">View combined data</p>
              </div>
              {!selectedBrand && <Check className="h-4 w-4 text-primary" />}
            </button>
          </div>

          {/* Brand list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {availableBrands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleSelect(brand.slug)}
                disabled={isSwitching}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                  'hover:bg-accent focus:bg-accent focus:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  selectedBrand?.id === brand.id && 'bg-accent'
                )}
                role="option"
                aria-selected={selectedBrand?.id === brand.id}
              >
                <BrandLogo brand={brand} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{brand.name}</span>
                    {brand.status === 'pending' && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        Pending
                      </span>
                    )}
                    {brand.status === 'paused' && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </div>
                  {showBalance && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(brand.balanceCents / 100)} available
                    </p>
                  )}
                </div>
                {selectedBrand?.id === brand.id && (
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact brand indicator (for mobile header)
 */
export function BrandIndicator({ className }: { className?: string }) {
  const { selectedBrand, hasMultipleBrands } = useBrand()

  if (!hasMultipleBrands) return null

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      {selectedBrand ? (
        <>
          <Building2 className="h-3.5 w-3.5" />
          <span className="max-w-24 truncate">{selectedBrand.name}</span>
        </>
      ) : (
        <>
          <Layers className="h-3.5 w-3.5" />
          <span>All Brands</span>
        </>
      )}
    </div>
  )
}

export { BrandLogo }
