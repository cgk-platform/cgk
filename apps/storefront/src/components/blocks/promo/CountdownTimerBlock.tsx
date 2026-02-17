'use client'

/**
 * Countdown Timer Block Component
 *
 * Sale countdown timer with urgency messaging, multiple visual styles,
 * and configurable end behavior. Different from the basic countdown block
 * by including promotional messaging and styling.
 */

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ButtonConfig } from '../types'

/**
 * Countdown Timer block configuration
 */
export interface CountdownTimerConfig {
  /** Section headline */
  headline?: string
  /** Urgency message */
  urgencyMessage?: string
  /** Target date/time (ISO string) */
  targetDate: string
  /** What to do when countdown ends */
  endBehavior?: 'hide' | 'show-message' | 'redirect'
  /** Message to show when countdown ends */
  endMessage?: string
  /** URL to redirect to when countdown ends */
  redirectUrl?: string
  /** Visual style variant */
  style?: 'minimal' | 'boxed' | 'flip' | 'gradient'
  /** Show individual time units */
  showDays?: boolean
  showHours?: boolean
  showMinutes?: boolean
  showSeconds?: boolean
  /** Background color */
  backgroundColor?: string
  /** Text color */
  textColor?: string
  /** Accent color for numbers */
  accentColor?: string
  /** CTA button (optional) */
  ctaButton?: ButtonConfig
  /** Show progress bar */
  showProgressBar?: boolean
  /** Sale start date (for progress bar) */
  startDate?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Calculate time remaining until target date
 */
function calculateTimeRemaining(targetDate: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  totalSeconds: number
} {
  const target = new Date(targetDate).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: false,
    totalSeconds: Math.floor(diff / 1000),
  }
}

/**
 * Calculate progress percentage
 */
function calculateProgress(startDate: string | undefined, targetDate: string): number {
  if (!startDate) return 0

  const start = new Date(startDate).getTime()
  const target = new Date(targetDate).getTime()
  const now = Date.now()

  const total = target - start
  const elapsed = now - start

  if (elapsed <= 0) return 0
  if (elapsed >= total) return 100

  return Math.round((elapsed / total) * 100)
}

/**
 * Time unit component - Minimal style
 */
function TimeUnitMinimal({
  value,
  label,
  showSeparator,
  size,
  accentColor,
}: {
  value: number
  label: string
  showSeparator?: boolean
  size: 'sm' | 'md' | 'lg'
  accentColor?: string
}) {
  const sizeClasses = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-4xl sm:text-5xl',
    lg: 'text-5xl sm:text-6xl',
  }

  return (
    <div className="flex items-baseline gap-1">
      <span
        className={cn(
          'font-mono font-bold tabular-nums',
          sizeClasses[size]
        )}
        style={{ color: accentColor }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-sm font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
        {label.slice(0, 1)}
      </span>
      {showSeparator && (
        <span className={cn('mx-2 font-light text-[hsl(var(--portal-border))]', sizeClasses[size])}>
          :
        </span>
      )}
    </div>
  )
}

/**
 * Time unit component - Boxed style
 */
function TimeUnitBoxed({
  value,
  label,
  size,
  accentColor,
}: {
  value: number
  label: string
  size: 'sm' | 'md' | 'lg'
  accentColor?: string
}) {
  const sizeClasses = {
    sm: 'h-16 w-16 text-2xl',
    md: 'h-20 w-20 sm:h-24 sm:w-24 text-3xl sm:text-4xl',
    lg: 'h-24 w-24 sm:h-28 sm:w-28 text-4xl sm:text-5xl',
  }

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl',
          'bg-[hsl(var(--portal-card))]',
          'border border-[hsl(var(--portal-border))]',
          'shadow-lg',
          sizeClasses[size]
        )}
      >
        {/* Reflection effect */}
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/5 to-transparent" />

        <span
          className="font-mono font-bold tabular-nums"
          style={{ color: accentColor }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className={cn('mt-3 font-semibold uppercase tracking-widest text-[hsl(var(--portal-muted-foreground))]', labelSizeClasses[size])}>
        {label}
      </span>
    </div>
  )
}

/**
 * Time unit component - Flip style (simulated)
 */
function TimeUnitFlip({
  value,
  label,
  size,
  accentColor,
}: {
  value: number
  label: string
  size: 'sm' | 'md' | 'lg'
  accentColor?: string
}) {
  const sizeClasses = {
    sm: 'h-14 w-10',
    md: 'h-20 w-14 sm:h-24 sm:w-16',
    lg: 'h-24 w-16 sm:h-28 sm:w-20',
  }

  const fontSizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
  }

  const digits = String(value).padStart(2, '0').split('')

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1">
        {digits.map((digit, index) => (
          <div
            key={index}
            className={cn(
              'relative flex items-center justify-center rounded-lg overflow-hidden',
              'bg-gradient-to-b from-gray-800 to-gray-900',
              sizeClasses[size]
            )}
          >
            {/* Top half */}
            <div className="absolute inset-x-0 top-0 h-1/2 border-b border-black/20 bg-black/10" />

            <span
              className={cn('font-mono font-bold tabular-nums text-white', fontSizeClasses[size])}
              style={{ color: accentColor || 'white' }}
            >
              {digit}
            </span>

            {/* Reflection line */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-black/30" />
          </div>
        ))}
      </div>
      <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--portal-muted-foreground))]">
        {label}
      </span>
    </div>
  )
}

/**
 * Time unit component - Gradient style
 */
function TimeUnitGradient({
  value,
  label,
  size,
}: {
  value: number
  label: string
  size: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-16 w-16 text-2xl',
    md: 'h-20 w-20 sm:h-24 sm:w-24 text-3xl sm:text-4xl',
    lg: 'h-24 w-24 sm:h-28 sm:w-28 text-4xl sm:text-5xl',
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative flex items-center justify-center rounded-2xl',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
          'shadow-xl',
          sizeClasses[size]
        )}
      >
        <span className="font-mono font-bold tabular-nums text-white">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-3 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--portal-muted-foreground))]">
        {label}
      </span>
    </div>
  )
}

/**
 * Countdown Timer Block Component
 */
export function CountdownTimerBlock({ block, className }: BlockProps<CountdownTimerConfig>) {
  const {
    headline,
    urgencyMessage,
    targetDate,
    endBehavior = 'hide',
    endMessage = 'Sale has ended',
    redirectUrl,
    style = 'boxed',
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    backgroundColor,
    textColor,
    accentColor,
    ctaButton,
    showProgressBar = false,
    startDate,
    size = 'md',
  } = block.config

  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining(targetDate)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate)
      setTimeRemaining(remaining)

      // Handle redirect on expiry
      if (remaining.isExpired && endBehavior === 'redirect' && redirectUrl) {
        window.location.href = redirectUrl
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate, endBehavior, redirectUrl])

  const units = useMemo(() => {
    const result: Array<{ value: number; label: string }> = []
    if (showDays) result.push({ value: timeRemaining.days, label: 'Days' })
    if (showHours) result.push({ value: timeRemaining.hours, label: 'Hours' })
    if (showMinutes) result.push({ value: timeRemaining.minutes, label: 'Minutes' })
    if (showSeconds) result.push({ value: timeRemaining.seconds, label: 'Seconds' })
    return result
  }, [timeRemaining, showDays, showHours, showMinutes, showSeconds])

  const progress = useMemo(() => {
    if (!showProgressBar) return 0
    return calculateProgress(startDate, targetDate)
  }, [showProgressBar, startDate, targetDate])

  // Handle expired countdown
  if (timeRemaining.isExpired) {
    if (endBehavior === 'hide') {
      return null
    }
    return (
      <section
        className={cn('py-12 sm:py-16', className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        <div className="mx-auto max-w-7xl px-6 text-center sm:px-8">
          <p className="text-xl font-medium text-[hsl(var(--portal-muted-foreground))]">
            {endMessage}
          </p>
        </div>
      </section>
    )
  }

  const TimeUnit =
    style === 'minimal'
      ? TimeUnitMinimal
      : style === 'flip'
        ? TimeUnitFlip
        : style === 'gradient'
          ? TimeUnitGradient
          : TimeUnitBoxed

  return (
    <section
      className={cn('py-12 sm:py-16', className)}
      style={{
        backgroundColor: backgroundColor || 'transparent',
        color: textColor,
      }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Urgency Message */}
        {urgencyMessage && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber-600">
              <span className="h-2 w-2 animate-ping rounded-full bg-current" />
              {urgencyMessage}
            </span>
          </div>
        )}

        {/* Headline */}
        {headline && (
          <h2 className="mb-8 text-center text-xl font-bold text-[hsl(var(--portal-foreground))] sm:text-2xl lg:text-3xl">
            {headline}
          </h2>
        )}

        {/* Progress Bar */}
        {showProgressBar && (
          <div className="mb-8">
            <div className="mx-auto max-w-md">
              <div className="mb-2 flex justify-between text-xs text-[hsl(var(--portal-muted-foreground))]">
                <span>Sale started</span>
                <span>{progress}% complete</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--portal-muted))]">
                <div
                  className="h-full bg-gradient-to-r from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Countdown */}
        <div className="flex justify-center">
          {style === 'minimal' ? (
            <div className="flex flex-wrap items-baseline justify-center gap-2">
              {units.map((unit, index) => (
                <TimeUnitMinimal
                  key={unit.label}
                  value={unit.value}
                  label={unit.label}
                  showSeparator={index < units.length - 1}
                  size={size}
                  accentColor={accentColor}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {units.map((unit) => (
                <TimeUnit
                  key={unit.label}
                  value={unit.value}
                  label={unit.label}
                  size={size}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}
        </div>

        {/* CTA Button */}
        {ctaButton && (
          <div className="mt-10 text-center">
            <a
              href={ctaButton.href}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4',
                'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                'font-bold shadow-lg transition-all duration-200',
                'hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5'
              )}
              {...(ctaButton.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {ctaButton.text}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
