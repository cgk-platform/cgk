'use client'

/**
 * CTA Banner Block Component
 *
 * Call-to-action banner with headline, description, and button.
 * Supports centered and split layouts with optional background image.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk/ui'
import type { BlockProps, CTABannerConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * CTA Banner Block Component
 */
export function CTABannerBlock({ block, className }: BlockProps<CTABannerConfig>) {
  const {
    headline,
    description,
    button,
    backgroundColor,
    backgroundImage,
    textColor,
    layout = 'centered',
    showPattern = true,
  } = block.config

  const hasBackgroundImage = !!backgroundImage?.src

  return (
    <section
      className={cn(
        'relative overflow-hidden py-20 sm:py-28',
        className
      )}
      style={{
        backgroundColor: backgroundColor || 'hsl(var(--portal-primary))',
      }}
    >
      {/* Background Image */}
      {hasBackgroundImage && (
        <>
          <Image
            src={backgroundImage.src}
            alt={backgroundImage.alt || ''}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}

      {/* Decorative Pattern */}
      {showPattern && !hasBackgroundImage && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Floating orbs */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

          {/* Diagonal lines */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 40px,
                rgba(255,255,255,0.2) 40px,
                rgba(255,255,255,0.2) 41px
              )`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        {layout === 'centered' ? (
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className={cn(
                'text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl',
                'animate-fade-in-up'
              )}
              style={{ color: textColor || 'white', animationDelay: '0ms' }}
            >
              {headline}
            </h2>

            {description && (
              <p
                className={cn(
                  'mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-90',
                  'animate-fade-in-up'
                )}
                style={{ color: textColor || 'white', animationDelay: '100ms' }}
              >
                {description}
              </p>
            )}

            {button && (
              <div
                className="mt-10 animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                <Link
                  href={button.href}
                  className={cn(
                    'group inline-flex items-center gap-3 rounded-lg px-8 py-4',
                    'bg-white text-[hsl(var(--portal-primary))]',
                    'font-semibold transition-all duration-300',
                    'hover:bg-white/90 hover:shadow-2xl',
                    'hover:-translate-y-0.5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
                  )}
                  {...(button.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  {button.text}
                  <LucideIcon
                    name="ArrowRight"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row lg:gap-16">
            <div className="flex-1 lg:max-w-2xl">
              <h2
                className={cn(
                  'text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl',
                  'animate-fade-in-up'
                )}
                style={{ color: textColor || 'white', animationDelay: '0ms' }}
              >
                {headline}
              </h2>

              {description && (
                <p
                  className={cn(
                    'mt-6 text-lg leading-relaxed opacity-90',
                    'animate-fade-in-up'
                  )}
                  style={{ color: textColor || 'white', animationDelay: '100ms' }}
                >
                  {description}
                </p>
              )}
            </div>

            {button && (
              <div
                className="flex-shrink-0 animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                <Link
                  href={button.href}
                  className={cn(
                    'group inline-flex items-center gap-3 rounded-lg px-8 py-4',
                    'bg-white text-[hsl(var(--portal-primary))]',
                    'font-semibold transition-all duration-300',
                    'hover:bg-white/90 hover:shadow-2xl',
                    'hover:-translate-y-0.5',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
                  )}
                  {...(button.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  {button.text}
                  <LucideIcon
                    name="ArrowRight"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
