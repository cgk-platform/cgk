'use client'

import { cn } from '@cgk-platform/ui'
import { useCallback } from 'react'

import { CONTENT_TYPES } from '@/lib/brand-preferences/constants'
import type { ContentType } from '@/lib/types'

interface ContentTypeSelectorProps {
  selected: ContentType[]
  onChange: (types: ContentType[]) => void
  disabled?: boolean
}

/**
 * ContentTypeSelector - Multi-select list of content types
 *
 * Features:
 * - Clean list with descriptions
 * - Toggle selection on click
 * - Subtle hover/active states
 */
export function ContentTypeSelector({
  selected,
  onChange,
  disabled = false,
}: ContentTypeSelectorProps): React.JSX.Element {
  const handleToggle = useCallback(
    (type: ContentType) => {
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
    <div className="grid gap-2 sm:grid-cols-2">
      {CONTENT_TYPES.map((contentType) => {
        const isSelected = selected.includes(contentType.id)

        return (
          <button
            key={contentType.id}
            type="button"
            onClick={() => handleToggle(contentType.id)}
            disabled={disabled}
            className={cn(
              'group flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            {/* Checkbox */}
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
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

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'font-medium transition-colors',
                  isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {contentType.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {contentType.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
