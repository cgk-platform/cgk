'use client'

import { cn } from '@cgk-platform/ui'
import { useState } from 'react'

import {
  REACTION_EMOJIS,
  type AddReactionInput,
  type ReactionSummary,
} from '@cgk-platform/video/interactions'

interface ReactionsBarProps {
  reactions: ReactionSummary[]
  currentTime?: number
  onToggleReaction: (input: AddReactionInput) => Promise<void>
  showPicker?: boolean
  className?: string
}

/**
 * Reactions bar with emoji picker
 *
 * Features:
 * - Display aggregated reaction counts
 * - Quick emoji picker
 * - Toggle reactions on/off
 * - Optional timestamp attachment
 */
export function ReactionsBar({
  reactions,
  currentTime,
  onToggleReaction,
  showPicker = true,
  className,
}: ReactionsBarProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReaction = async (emoji: string) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await onToggleReaction({
        emoji,
        timestampSeconds: currentTime !== undefined ? Math.floor(currentTime) : null,
      })
    } finally {
      setIsSubmitting(false)
      setIsPickerOpen(false)
    }
  }

  // Sort reactions by count (descending)
  const sortedReactions = [...reactions].sort((a, b) => b.count - a.count)
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Existing reactions */}
      {sortedReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji)}
          disabled={isSubmitting}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm transition-all',
            reaction.hasReacted
              ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          <span className="text-base">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {showPicker && (
        <div className="relative">
          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              isPickerOpen
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <span className="text-lg">+</span>
          </button>

          {/* Emoji picker dropdown */}
          {isPickerOpen && (
            <>
              {/* Backdrop to close picker */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPickerOpen(false)}
              />

              <div className="absolute bottom-full left-0 z-50 mb-2 rounded-lg border bg-popover p-2 shadow-lg">
                <div className="flex gap-1">
                  {REACTION_EMOJIS.map((item) => {
                    const existing = reactions.find((r) => r.emoji === item.emoji)
                    const hasReacted = existing?.hasReacted || false

                    return (
                      <button
                        key={item.emoji}
                        onClick={() => handleReaction(item.emoji)}
                        disabled={isSubmitting}
                        title={item.label}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md text-xl transition-all hover:scale-110',
                          hasReacted
                            ? 'bg-amber-500/20'
                            : 'hover:bg-muted'
                        )}
                      >
                        {item.emoji}
                      </button>
                    )
                  })}
                </div>

                {/* Keyboard hints */}
                <div className="mt-2 border-t pt-2 text-center text-xs text-muted-foreground">
                  Press <kbd className="rounded bg-muted px-1">1</kbd>-
                  <kbd className="rounded bg-muted px-1">8</kbd> to react
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Total count */}
      {totalReactions > 0 && (
        <span className="ml-1 text-sm text-muted-foreground">
          {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

interface ReactionTimelineProps {
  density: number[]
  className?: string
}

/**
 * Visual timeline showing reaction density across video duration
 */
export function ReactionTimeline({ density, className }: ReactionTimelineProps) {
  const maxDensity = Math.max(...density)

  return (
    <div className={cn('flex h-6 items-end gap-px', className)}>
      {density.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t bg-amber-500/60 transition-all"
          style={{
            height: `${(value / maxDensity) * 100}%`,
            minHeight: value > 0 ? '2px' : '0',
          }}
        />
      ))}
    </div>
  )
}
