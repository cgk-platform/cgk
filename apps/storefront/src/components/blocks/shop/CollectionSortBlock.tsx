'use client'

/**
 * Collection Sort Block Component
 *
 * Sort dropdown for product collections with product count display.
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, CollectionSortConfig, SortOption } from '../types'
import { LucideIcon } from '../icons'

/**
 * Default sort options
 */
const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title-asc', label: 'Alphabetically: A-Z' },
  { value: 'title-desc', label: 'Alphabetically: Z-A' },
]

/**
 * Collection Sort Block Component
 */
export function CollectionSortBlock({ block, className }: BlockProps<CollectionSortConfig>) {
  const {
    options = DEFAULT_SORT_OPTIONS,
    defaultValue = 'featured',
    showProductCount = true,
    productCount = 0,
    layout = 'dropdown',
    backgroundColor,
  } = block.config

  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === selectedValue) || options[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (value: string) => {
    setSelectedValue(value)
    setIsOpen(false)
    // In a real implementation, this would trigger a sort callback
    // onSortChange?.(value)
  }

  if (layout === 'inline') {
    return (
      <div
        className={cn('flex flex-wrap items-center gap-4', className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        {showProductCount && (
          <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </span>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            Sort by:
          </span>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  selectedValue === option.value
                    ? 'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]'
                    : 'bg-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted-foreground))] hover:bg-[hsl(var(--portal-muted))]/80'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Dropdown layout (default)
  return (
    <div
      className={cn('flex items-center justify-between gap-4', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      {showProductCount && (
        <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </span>
      )}

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-2',
            'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'text-sm font-medium text-[hsl(var(--portal-foreground))]',
            'transition-all',
            'hover:border-[hsl(var(--portal-primary))]',
            isOpen && 'border-[hsl(var(--portal-primary))] ring-1 ring-[hsl(var(--portal-primary))]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <LucideIcon name="ArrowUpDown" className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]" />
          <span>Sort by: {selectedOption?.label}</span>
          <LucideIcon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]"
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-50 mt-2 min-w-[200px]',
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] py-2 shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-200'
            )}
            role="listbox"
            aria-label="Sort options"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                  'transition-colors',
                  selectedValue === option.value
                    ? 'bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]'
                    : 'text-[hsl(var(--portal-foreground))] hover:bg-[hsl(var(--portal-muted))]'
                )}
                role="option"
                aria-selected={selectedValue === option.value}
              >
                <span className="flex-1">{option.label}</span>
                {selectedValue === option.value && (
                  <LucideIcon name="Check" className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Standalone sort component for use outside of blocks
 */
export function CollectionSort({
  options = DEFAULT_SORT_OPTIONS,
  value,
  onChange,
  productCount,
  showProductCount = true,
  className,
}: {
  options?: SortOption[]
  value: string
  onChange: (value: string) => void
  productCount?: number
  showProductCount?: boolean
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (newValue: string) => {
    onChange(newValue)
    setIsOpen(false)
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {showProductCount && productCount !== undefined && (
        <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </span>
      )}

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-2',
            'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]',
            'text-sm font-medium text-[hsl(var(--portal-foreground))]',
            'transition-all',
            'hover:border-[hsl(var(--portal-primary))]',
            isOpen && 'border-[hsl(var(--portal-primary))] ring-1 ring-[hsl(var(--portal-primary))]'
          )}
        >
          <LucideIcon name="ArrowUpDown" className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]" />
          <span>Sort by: {selectedOption?.label}</span>
          <LucideIcon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            className="h-4 w-4 text-[hsl(var(--portal-muted-foreground))]"
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-50 mt-2 min-w-[200px]',
              'rounded-xl border border-[hsl(var(--portal-border))]',
              'bg-[hsl(var(--portal-card))] py-2 shadow-xl'
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                  'transition-colors',
                  value === option.value
                    ? 'bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]'
                    : 'text-[hsl(var(--portal-foreground))] hover:bg-[hsl(var(--portal-muted))]'
                )}
              >
                <span className="flex-1">{option.label}</span>
                {value === option.value && (
                  <LucideIcon name="Check" className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
