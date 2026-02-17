'use client'

/**
 * Guarantee Block Component
 *
 * Displays guarantee/warranty information with icon, headline,
 * bullet points of coverage, and optional "Learn more" link.
 */

import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ButtonConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Guarantee item
 */
export interface GuaranteeItem {
  text: string
  icon?: string
}

/**
 * Guarantee block configuration
 */
export interface GuaranteeBlockConfig {
  headline: string
  description?: string
  icon?: 'shield' | 'check' | 'award' | 'badge' | 'lock' | 'star'
  guaranteeItems: GuaranteeItem[]
  learnMoreLink?: ButtonConfig
  style?: 'card' | 'banner' | 'minimal'
  alignment?: 'left' | 'center'
  backgroundColor?: string
  accentColor?: string
}

/**
 * Icon mapping for guarantee types
 */
const guaranteeIcons = {
  shield: 'ShieldCheck',
  check: 'CheckCircle',
  award: 'Award',
  badge: 'BadgeCheck',
  lock: 'Lock',
  star: 'Star',
} as const

/**
 * Guarantee Block Component
 */
export function GuaranteeBlock({ block, className }: BlockProps<GuaranteeBlockConfig>) {
  const {
    headline,
    description,
    icon = 'shield',
    guaranteeItems,
    learnMoreLink,
    style = 'card',
    alignment = 'center',
    backgroundColor,
  } = block.config

  const iconName = guaranteeIcons[icon]
  const isCentered = alignment === 'center'

  if (style === 'banner') {
    return (
      <section
        className={cn('py-8 sm:py-12', className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl px-8 py-10 sm:px-12',
              'bg-gradient-to-r from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/80'
            )}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="guarantee-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill="currentColor" />
                </pattern>
                <rect width="100" height="100" fill="url(#guarantee-pattern)" />
              </svg>
            </div>

            <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              {/* Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <LucideIcon name={iconName} className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  {headline}
                </h3>
                {description && (
                  <p className="mt-2 text-white/90">
                    {description}
                  </p>
                )}
              </div>

              {/* Guarantee items */}
              <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
                {guaranteeItems.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm"
                  >
                    <LucideIcon
                      name={item.icon || 'Check'}
                      className="h-4 w-4 shrink-0"
                    />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (style === 'minimal') {
    return (
      <section
        className={cn('py-12 sm:py-16', className)}
        style={{ backgroundColor: backgroundColor || 'transparent' }}
      >
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          <div
            className={cn(
              'flex flex-col gap-6',
              isCentered ? 'items-center text-center' : 'items-start'
            )}
          >
            {/* Icon */}
            <div className="flex items-center gap-3">
              <LucideIcon
                name={iconName}
                className="h-8 w-8 text-[hsl(var(--portal-primary))]"
              />
              <h3 className="text-xl font-bold text-[hsl(var(--portal-foreground))]">
                {headline}
              </h3>
            </div>

            {/* Description */}
            {description && (
              <p className="max-w-2xl text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}

            {/* Items grid */}
            <div
              className={cn(
                'flex flex-wrap gap-x-8 gap-y-3',
                isCentered && 'justify-center'
              )}
            >
              {guaranteeItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-[hsl(var(--portal-foreground))]"
                >
                  <LucideIcon
                    name={item.icon || 'Check'}
                    className="h-5 w-5 shrink-0 text-green-500"
                  />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Learn more link */}
            {learnMoreLink && (
              <Link
                href={learnMoreLink.href}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--portal-primary))] hover:underline"
                {...(learnMoreLink.openInNewTab && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {learnMoreLink.text}
                <LucideIcon name="ArrowRight" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }

  // Default: card style
  return (
    <section
      className={cn('py-16 sm:py-24', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-8 sm:p-12',
            'bg-[hsl(var(--portal-card))]',
            'border border-[hsl(var(--portal-border))]',
            'shadow-xl'
          )}
        >
          {/* Decorative background */}
          <div className="absolute -right-12 -top-12 opacity-5">
            <LucideIcon name={iconName} className="h-64 w-64" />
          </div>

          <div
            className={cn(
              'relative flex flex-col gap-6',
              isCentered ? 'items-center text-center' : 'items-start'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-2xl',
                'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/70',
                'shadow-lg shadow-[hsl(var(--portal-primary))]/25'
              )}
            >
              <LucideIcon name={iconName} className="h-10 w-10 text-white" />
            </div>

            {/* Headline */}
            <h2 className="text-2xl font-bold text-[hsl(var(--portal-foreground))] sm:text-3xl">
              {headline}
            </h2>

            {/* Description */}
            {description && (
              <p className="max-w-xl text-lg text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}

            {/* Guarantee items */}
            <ul
              className={cn(
                'mt-2 space-y-4',
                isCentered && 'text-left'
              )}
            >
              {guaranteeItems.map((item, index) => (
                <li
                  key={index}
                  className={cn(
                    'flex items-start gap-4',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <LucideIcon
                      name={item.icon || 'Check'}
                      className="h-4 w-4 text-green-600"
                    />
                  </div>
                  <span className="text-[hsl(var(--portal-foreground))]">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Learn more link */}
            {learnMoreLink && (
              <Link
                href={learnMoreLink.href}
                className={cn(
                  'mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg',
                  'bg-[hsl(var(--portal-muted))]',
                  'font-medium text-[hsl(var(--portal-foreground))]',
                  'hover:bg-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary-foreground))]',
                  'transition-all duration-300'
                )}
                {...(learnMoreLink.openInNewTab && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {learnMoreLink.text}
                <LucideIcon name="ArrowRight" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
