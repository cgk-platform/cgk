'use client'

import { cn } from '@cgk/ui'
import { useCallback } from 'react'

import { PARTNERSHIP_TYPES } from '@/lib/brand-preferences/constants'
import type { PartnershipType } from '@/lib/types'

interface PartnershipTypeSelectorProps {
  selected: PartnershipType[]
  onChange: (types: PartnershipType[]) => void
  disabled?: boolean
}

/**
 * PartnershipTypeSelector - Multi-select cards for partnership types
 *
 * Features:
 * - Descriptive cards with explanations
 * - Visual selection states
 * - Accessible keyboard navigation
 */
export function PartnershipTypeSelector({
  selected,
  onChange,
  disabled = false,
}: PartnershipTypeSelectorProps): React.JSX.Element {
  const handleToggle = useCallback(
    (type: PartnershipType) => {
      if (disabled) return

      if (selected.includes(type)) {
        onChange(selected.filter((t) => t !== type))
      } else {
        onChange([...selected, type])
      }
    },
    [selected, onChange, disabled]
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PARTNERSHIP_TYPES.map((partnership) => {
        const isSelected = selected.includes(partnership.id)

        return (
          <button
            key={partnership.id}
            type="button"
            onClick={() => handleToggle(partnership.id)}
            disabled={disabled}
            className={cn(
              'group relative flex flex-col rounded-xl border p-4 text-left transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            {/* Selection indicator */}
            <span
              className={cn(
                'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30 bg-background'
              )}
            >
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>

            {/* Icon */}
            <div
              className={cn(
                'mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <PartnershipIcon type={partnership.id} />
            </div>

            {/* Content */}
            <div
              className={cn(
                'mb-1 font-semibold transition-colors',
                isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}
            >
              {partnership.label}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{partnership.description}</p>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Icon component for partnership types
 */
function PartnershipIcon({ type }: { type: PartnershipType }): React.JSX.Element {
  const icons: Record<PartnershipType, React.JSX.Element> = {
    affiliate: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    sponsored: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    ambassador: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
      </svg>
    ),
    ugc: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    gifted: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect width="20" height="5" x="2" y="7" />
        <line x1="12" x2="12" y1="22" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  }

  return icons[type]
}
