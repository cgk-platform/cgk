/**
 * Countdown Block Component
 *
 * Countdown timer for promotions and time-limited offers.
 * Supports multiple visual styles and configurable time units.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@cgk/ui'
import type { BlockProps, CountdownConfig } from '../types'

/**
 * Calculate time remaining until target date
 */
function calculateTimeRemaining(targetDate: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
} {
  const target = new Date(targetDate).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: false,
  }
}

/**
 * Time unit display component - Minimal style
 */
function TimeUnitMinimal({
  value,
  label,
  showSeparator,
}: {
  value: number
  label: string
  showSeparator?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-mono text-4xl font-bold text-[hsl(var(--portal-foreground))] tabular-nums sm:text-5xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-sm font-medium uppercase tracking-wider text-[hsl(var(--portal-muted-foreground))]">
        {label}
      </span>
      {showSeparator && (
        <span className="mx-3 text-4xl font-light text-[hsl(var(--portal-border))] sm:text-5xl">
          :
        </span>
      )}
    </div>
  )
}

/**
 * Time unit display component - Boxed style
 */
function TimeUnitBoxed({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-xl sm:h-24 sm:w-24',
          'bg-[hsl(var(--portal-card))]',
          'border border-[hsl(var(--portal-border))]',
          'shadow-lg'
        )}
      >
        {/* Reflection effect */}
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/5 to-transparent" />

        <span className="font-mono text-3xl font-bold text-[hsl(var(--portal-foreground))] tabular-nums sm:text-4xl">
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
 * Time unit display component - Circular style
 */
function TimeUnitCircular({
  value,
  label,
  max,
}: {
  value: number
  label: string
  max: number
}) {
  const progress = (value / max) * 100
  const circumference = 2 * Math.PI * 40 // radius = 40

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        {/* Background circle */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--portal-muted))"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--portal-primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            className="transition-all duration-500"
          />
        </svg>

        {/* Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-[hsl(var(--portal-foreground))] tabular-nums sm:text-3xl">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-[hsl(var(--portal-muted-foreground))]">
        {label}
      </span>
    </div>
  )
}

/**
 * Countdown Block Component
 */
export function CountdownBlock({ block, className }: BlockProps<CountdownConfig>) {
  const {
    headline,
    targetDate,
    endBehavior = 'hide',
    endMessage = 'Offer has ended',
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    backgroundColor,
    style = 'boxed',
  } = block.config

  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining(targetDate)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const units = useMemo(() => {
    const result: Array<{ value: number; label: string; max: number }> = []
    if (showDays) result.push({ value: timeRemaining.days, label: 'Days', max: 99 })
    if (showHours) result.push({ value: timeRemaining.hours, label: 'Hours', max: 24 })
    if (showMinutes)
      result.push({ value: timeRemaining.minutes, label: 'Minutes', max: 60 })
    if (showSeconds)
      result.push({ value: timeRemaining.seconds, label: 'Seconds', max: 60 })
    return result
  }, [
    timeRemaining,
    showDays,
    showHours,
    showMinutes,
    showSeconds,
  ])

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

  return (
    <section
      className={cn('py-12 sm:py-16', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Headline */}
        {headline && (
          <h2 className="mb-8 text-center text-xl font-semibold text-[hsl(var(--portal-foreground))] sm:text-2xl">
            {headline}
          </h2>
        )}

        {/* Countdown */}
        <div className="flex justify-center">
          {style === 'minimal' && (
            <div className="flex flex-wrap items-baseline justify-center gap-2">
              {units.map((unit, index) => (
                <TimeUnitMinimal
                  key={unit.label}
                  value={unit.value}
                  label={unit.label}
                  showSeparator={index < units.length - 1}
                />
              ))}
            </div>
          )}

          {style === 'boxed' && (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {units.map((unit) => (
                <TimeUnitBoxed
                  key={unit.label}
                  value={unit.value}
                  label={unit.label}
                />
              ))}
            </div>
          )}

          {style === 'circular' && (
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
              {units.map((unit) => (
                <TimeUnitCircular
                  key={unit.label}
                  value={unit.value}
                  label={unit.label}
                  max={unit.max}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
