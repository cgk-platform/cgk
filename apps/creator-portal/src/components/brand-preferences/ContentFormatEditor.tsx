'use client'

import { Button, cn } from '@cgk/ui'
import { useCallback } from 'react'

import { CONTENT_FORMATS, PROFICIENCY_LEVELS } from '@/lib/brand-preferences/constants'
import type { ContentFormat, ContentFormatPreference, ProficiencyLevel } from '@/lib/types'

interface ContentFormatEditorProps {
  formats: ContentFormatPreference[]
  onChange: (formats: ContentFormatPreference[]) => void
  disabled?: boolean
}

/**
 * ContentFormatEditor - Manage content formats with proficiency levels
 *
 * Features:
 * - Add/remove content formats
 * - Set proficiency level per format
 * - Visual proficiency indicator
 */
export function ContentFormatEditor({
  formats,
  onChange,
  disabled = false,
}: ContentFormatEditorProps): React.JSX.Element {
  const handleToggleFormat = useCallback(
    (format: ContentFormat) => {
      if (disabled) return

      const exists = formats.find((f) => f.format === format)
      if (exists) {
        onChange(formats.filter((f) => f.format !== format))
      } else {
        onChange([...formats, { format, proficiency: 'intermediate' }])
      }
    },
    [formats, onChange, disabled]
  )

  const handleProficiencyChange = useCallback(
    (format: ContentFormat, proficiency: ProficiencyLevel) => {
      if (disabled) return

      onChange(
        formats.map((f) => (f.format === format ? { ...f, proficiency } : f))
      )
    },
    [formats, onChange, disabled]
  )

  return (
    <div className="space-y-3">
      {CONTENT_FORMATS.map((contentFormat) => {
        const selected = formats.find((f) => f.format === contentFormat.id)
        const isSelected = Boolean(selected)

        return (
          <div
            key={contentFormat.id}
            className={cn(
              'rounded-lg border transition-all',
              isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
            )}
          >
            <button
              type="button"
              onClick={() => handleToggleFormat(contentFormat.id)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Checkbox */}
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
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
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                <FormatIcon name={contentFormat.icon} />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'flex-1 font-medium transition-colors',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {contentFormat.label}
              </span>
            </button>

            {/* Proficiency selector (shown when selected) */}
            {isSelected && (
              <div className="border-t border-primary/20 px-4 py-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Proficiency Level
                </div>
                <div className="flex gap-2">
                  {PROFICIENCY_LEVELS.map((level) => (
                    <Button
                      key={level.id}
                      type="button"
                      size="sm"
                      variant={selected?.proficiency === level.id ? 'default' : 'outline'}
                      onClick={() => handleProficiencyChange(contentFormat.id, level.id)}
                      disabled={disabled}
                      className="flex-1"
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Icon component for content formats
 */
function FormatIcon({ name }: { name: string }): React.JSX.Element {
  const icons: Record<string, React.JSX.Element> = {
    video: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    camera: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    pen: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
    microphone: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
    broadcast: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </svg>
    ),
  }

  return icons[name] || (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
