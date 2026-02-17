'use client'

/**
 * Urgency Banner Block Component
 *
 * Creates urgency/scarcity with countdown timers, low stock indicators,
 * limited time messages, and attention-grabbing animations.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ButtonConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Urgency Banner block configuration
 */
export interface UrgencyBannerBlockConfig {
  message: string
  subMessage?: string
  endDate?: string
  showCountdown?: boolean
  stockCount?: number
  stockThreshold?: number
  showStockIndicator?: boolean
  ctaButton?: ButtonConfig
  style?: 'bar' | 'floating' | 'inline'
  position?: 'top' | 'bottom'
  animate?: boolean
  dismissible?: boolean
  backgroundColor?: string
  textColor?: string
}

/**
 * Time remaining interface
 */
interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

/**
 * Calculate time remaining until a date
 */
function getTimeRemaining(endDate: string): TimeRemaining {
  const total = new Date(endDate).getTime() - Date.now()

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  }

  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))

  return { days, hours, minutes, seconds, total }
}

/**
 * Countdown timer component
 */
function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(endDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(endDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  if (timeRemaining.total <= 0) {
    return <span className="font-bold">Expired</span>
  }

  const timeUnits = [
    { value: timeRemaining.days, label: 'd' },
    { value: timeRemaining.hours, label: 'h' },
    { value: timeRemaining.minutes, label: 'm' },
    { value: timeRemaining.seconds, label: 's' },
  ].filter((unit) => unit.value > 0 || unit.label === 's')

  return (
    <div className="flex items-center gap-1">
      {timeUnits.map((unit, index) => (
        <div key={unit.label} className="flex items-center">
          <span className="tabular-nums font-bold">
            {unit.value.toString().padStart(2, '0')}
          </span>
          <span className="text-sm opacity-80">{unit.label}</span>
          {index < timeUnits.length - 1 && (
            <span className="mx-0.5 opacity-50">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Stock indicator component
 */
function StockIndicator({
  stockCount,
  threshold = 10,
}: {
  stockCount: number
  threshold?: number
}) {
  const isLow = stockCount <= threshold
  const percentage = Math.min((stockCount / threshold) * 100, 100)

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isLow ? (
          <LucideIcon name="AlertTriangle" className="h-4 w-4 animate-pulse" />
        ) : (
          <LucideIcon name="Package" className="h-4 w-4" />
        )}
        <span className="font-semibold">
          {isLow ? `Only ${stockCount} left!` : `${stockCount} in stock`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/30">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isLow ? 'bg-red-500 animate-pulse' : 'bg-green-400'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Urgency Banner Block Component
 */
export function UrgencyBannerBlock({ block, className }: BlockProps<UrgencyBannerBlockConfig>) {
  const {
    message,
    subMessage,
    endDate,
    showCountdown = true,
    stockCount,
    stockThreshold = 10,
    showStockIndicator = true,
    ctaButton,
    style = 'bar',
    position = 'top',
    animate = true,
    dismissible = false,
    backgroundColor,
    textColor,
  } = block.config

  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  // Check if countdown has expired
  useEffect(() => {
    if (endDate) {
      const checkExpiration = () => {
        const remaining = getTimeRemaining(endDate)
        setIsExpired(remaining.total <= 0)
      }

      checkExpiration()
      const timer = setInterval(checkExpiration, 1000)
      return () => clearInterval(timer)
    }
  }, [endDate])

  // Don't render if dismissed or expired
  if (isDismissed || isExpired) {
    return null
  }

  const hasCountdown = showCountdown && endDate
  const hasStock = showStockIndicator && stockCount !== undefined

  // Floating style
  if (style === 'floating') {
    return (
      <div
        className={cn(
          'fixed z-50',
          position === 'bottom' ? 'bottom-4 left-4 right-4' : 'top-4 left-4 right-4',
          className
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-xl overflow-hidden rounded-2xl p-4',
            'bg-gradient-to-r from-red-600 to-orange-500',
            'text-white shadow-2xl',
            animate && 'animate-slide-up'
          )}
          style={{
            backgroundColor: backgroundColor || undefined,
            color: textColor || undefined,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Pulsing indicator */}
            <div className="relative shrink-0">
              <div className="h-3 w-3 rounded-full bg-white" />
              <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{message}</p>
              {subMessage && (
                <p className="text-sm opacity-90 truncate">{subMessage}</p>
              )}
            </div>

            {/* Countdown */}
            {hasCountdown && (
              <div className="shrink-0">
                <CountdownTimer endDate={endDate} />
              </div>
            )}

            {/* CTA */}
            {ctaButton && (
              <Link
                href={ctaButton.href}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-lg font-semibold',
                  'bg-white text-red-600',
                  'hover:bg-white/90 transition-colors'
                )}
              >
                {ctaButton.text}
              </Link>
            )}

            {/* Dismiss button */}
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <LucideIcon name="X" className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline style
  if (style === 'inline') {
    return (
      <section
        className={cn('py-4', className)}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div
            className={cn(
              'flex flex-col items-center gap-4 rounded-xl p-6 sm:flex-row sm:justify-between',
              'bg-gradient-to-r from-amber-500 to-orange-500',
              'text-white shadow-lg'
            )}
            style={{
              backgroundColor: backgroundColor || undefined,
              color: textColor || undefined,
            }}
          >
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              {/* Icon with animation */}
              <div className={cn('shrink-0', animate && 'animate-bounce')}>
                <LucideIcon name="Zap" className="h-6 w-6" />
              </div>

              {/* Message */}
              <div className="text-center sm:text-left">
                <p className="font-bold text-lg">{message}</p>
                {subMessage && (
                  <p className="text-sm opacity-90">{subMessage}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Countdown */}
              {hasCountdown && (
                <div className="px-4 py-2 rounded-lg bg-black/20 backdrop-blur-sm">
                  <CountdownTimer endDate={endDate} />
                </div>
              )}

              {/* Stock indicator */}
              {hasStock && (
                <StockIndicator stockCount={stockCount} threshold={stockThreshold} />
              )}

              {/* CTA */}
              {ctaButton && (
                <Link
                  href={ctaButton.href}
                  className={cn(
                    'px-6 py-2.5 rounded-lg font-bold',
                    'bg-white text-orange-600',
                    'hover:bg-white/90 transition-colors',
                    'shadow-lg'
                  )}
                >
                  {ctaButton.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Default: bar style
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        animate && 'animate-gradient',
        className
      )}
      style={{
        background: backgroundColor || 'linear-gradient(90deg, #dc2626, #ea580c, #dc2626)',
        backgroundSize: animate ? '200% 100%' : '100% 100%',
        color: textColor || 'white',
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-3 sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
          {/* Animated fire icon */}
          {animate && (
            <LucideIcon
              name="Flame"
              className="h-5 w-5 animate-pulse text-yellow-300"
            />
          )}

          {/* Main message */}
          <p className="font-bold">{message}</p>

          {/* Sub message */}
          {subMessage && (
            <span className="text-sm opacity-90">
              {subMessage}
            </span>
          )}

          {/* Divider */}
          {(hasCountdown || hasStock) && (
            <span className="hidden h-4 w-px bg-current opacity-30 sm:block" />
          )}

          {/* Countdown */}
          {hasCountdown && (
            <div className="flex items-center gap-2">
              <LucideIcon name="Clock" className="h-4 w-4 opacity-80" />
              <CountdownTimer endDate={endDate} />
            </div>
          )}

          {/* Stock */}
          {hasStock && (
            <StockIndicator stockCount={stockCount} threshold={stockThreshold} />
          )}

          {/* CTA button */}
          {ctaButton && (
            <Link
              href={ctaButton.href}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full',
                'bg-white/20 backdrop-blur-sm',
                'font-semibold text-sm',
                'hover:bg-white/30 transition-colors'
              )}
            >
              {ctaButton.text}
              <LucideIcon name="ArrowRight" className="h-4 w-4" />
            </Link>
          )}

          {/* Dismiss */}
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <LucideIcon name="X" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          animation: gradient-shift 3s ease infinite;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </section>
  )
}
