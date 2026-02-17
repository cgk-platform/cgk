'use client'

/**
 * Promo Hero Block Component
 *
 * Promotional hero banner with discount display, urgency messaging,
 * and prominent call-to-action. Designed for sales and promotional landing pages.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig, ButtonConfig } from '../types'

/**
 * Promo Hero block configuration
 */
export interface PromoHeroConfig {
  /** Main promotional headline */
  headline: string
  /** Optional subheadline */
  subheadline?: string
  /** Promotional description */
  description?: string
  /** Discount badge text (e.g., "50% OFF", "BOGO") */
  discountBadge?: string
  /** Original price for strikethrough display */
  originalPrice?: string
  /** Sale/promo price */
  salePrice?: string
  /** Price savings text */
  savingsText?: string
  /** Background image */
  backgroundImage?: ImageConfig
  /** Background color fallback */
  backgroundColor?: string
  /** Overlay opacity for background images (0-1) */
  overlayOpacity?: number
  /** Text alignment */
  textAlignment?: 'left' | 'center' | 'right'
  /** Primary CTA button */
  primaryButton?: ButtonConfig
  /** Secondary CTA button */
  secondaryButton?: ButtonConfig
  /** Urgency text (e.g., "Limited Time Only") */
  urgencyText?: string
  /** Trust badges below CTA */
  trustBadges?: string[]
  /** Height variant */
  height?: 'sm' | 'md' | 'lg' | 'full'
  /** Enable gradient overlay */
  enableGradient?: boolean
}

/**
 * Height class mapping
 */
const heightClasses = {
  sm: 'min-h-[50vh]',
  md: 'min-h-[65vh]',
  lg: 'min-h-[80vh]',
  full: 'min-h-screen',
}

/**
 * Text alignment class mapping
 */
const alignmentClasses = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
}

/**
 * Promo CTA Button
 */
function PromoCTAButton({
  config,
  variant = 'primary',
}: {
  config: ButtonConfig
  variant?: 'primary' | 'secondary'
}) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2',
    'font-bold transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[hsl(var(--portal-primary))]'
  )

  const variantClasses =
    variant === 'primary'
      ? cn(
          'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
          'hover:bg-[hsl(var(--portal-primary))]/90',
          'shadow-xl hover:shadow-2xl hover:-translate-y-1',
          'px-10 py-5 text-lg rounded-lg'
        )
      : cn(
          'bg-white/20 text-white border-2 border-white/50',
          'hover:bg-white/30 hover:border-white',
          'backdrop-blur-sm',
          'px-8 py-4 text-base rounded-lg'
        )

  const buttonContent = (
    <>
      {config.text}
      {variant === 'primary' && (
        <svg
          className="h-5 w-5 transition-transform group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      )}
    </>
  )

  if (config.href) {
    return (
      <Link
        href={config.href}
        className={cn(baseClasses, variantClasses, 'group')}
        {...(config.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {buttonContent}
      </Link>
    )
  }

  return (
    <button className={cn(baseClasses, variantClasses, 'group')}>
      {buttonContent}
    </button>
  )
}

/**
 * Promo Hero Block Component
 */
export function PromoHeroBlock({ block, className }: BlockProps<PromoHeroConfig>) {
  const {
    headline,
    subheadline,
    description,
    discountBadge,
    originalPrice,
    salePrice,
    savingsText,
    backgroundImage,
    backgroundColor,
    overlayOpacity = 0.6,
    textAlignment = 'center',
    primaryButton,
    secondaryButton,
    urgencyText,
    trustBadges,
    height = 'lg',
    enableGradient = true,
  } = block.config

  const hasBackground = !!backgroundImage?.src

  return (
    <section
      className={cn(
        'relative flex flex-col justify-center overflow-hidden',
        heightClasses[height],
        className
      )}
      style={{
        backgroundColor: backgroundColor || 'hsl(var(--portal-background))',
      }}
    >
      {/* Background Image */}
      {backgroundImage?.src && (
        <>
          <Image
            src={backgroundImage.src}
            alt={backgroundImage.alt || ''}
            fill
            className="object-cover"
            priority={backgroundImage.priority}
            sizes="100vw"
          />
          {/* Overlay */}
          <div
            className={cn(
              'absolute inset-0',
              enableGradient
                ? 'bg-gradient-to-t from-black via-black/70 to-black/40'
                : 'bg-black'
            )}
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      {/* Decorative Elements */}
      {!hasBackground && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="animate-pulse-slow absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full bg-[hsl(var(--portal-primary))]/20 blur-[100px]" />
          <div className="animate-pulse-slow absolute -bottom-1/4 -right-1/4 h-[50vh] w-[50vh] rounded-full bg-[hsl(var(--portal-accent))]/15 blur-[80px]" style={{ animationDelay: '1s' }} />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-8 md:py-20',
          alignmentClasses[textAlignment]
        )}
      >
        {/* Discount Badge */}
        {discountBadge && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-6 py-2',
                'bg-gradient-to-r from-red-500 to-orange-500 text-white',
                'text-sm font-bold uppercase tracking-wider',
                'shadow-lg animate-pulse'
              )}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zm-2.207 6.207a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
              {discountBadge}
            </span>
          </div>
        )}

        {/* Urgency Text */}
        {urgencyText && (
          <div
            className="mb-4 animate-fade-in-up"
            style={{ animationDelay: '50ms' }}
          >
            <span
              className={cn(
                'inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest',
                hasBackground ? 'text-amber-300' : 'text-amber-600'
              )}
            >
              <span className="h-2 w-2 animate-ping rounded-full bg-current" />
              {urgencyText}
            </span>
          </div>
        )}

        {/* Headline */}
        <h1
          className={cn(
            'animate-fade-in-up font-bold tracking-tight',
            'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
            'leading-[1.05]',
            hasBackground ? 'text-white' : 'text-[hsl(var(--portal-foreground))]',
            textAlignment === 'center' && 'max-w-4xl'
          )}
          style={{ animationDelay: '100ms' }}
        >
          {headline}
        </h1>

        {/* Subheadline */}
        {subheadline && (
          <p
            className={cn(
              'mt-4 animate-fade-in-up text-xl font-medium sm:text-2xl',
              hasBackground ? 'text-white/90' : 'text-[hsl(var(--portal-primary))]'
            )}
            style={{ animationDelay: '150ms' }}
          >
            {subheadline}
          </p>
        )}

        {/* Description */}
        {description && (
          <p
            className={cn(
              'mt-6 max-w-2xl animate-fade-in-up text-lg leading-relaxed',
              hasBackground ? 'text-white/80' : 'text-[hsl(var(--portal-muted-foreground))]'
            )}
            style={{ animationDelay: '200ms' }}
          >
            {description}
          </p>
        )}

        {/* Pricing Display */}
        {(originalPrice || salePrice) && (
          <div
            className="mt-8 flex animate-fade-in-up flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: '250ms' }}
          >
            {originalPrice && (
              <span
                className={cn(
                  'text-2xl line-through opacity-60',
                  hasBackground ? 'text-white' : 'text-[hsl(var(--portal-muted-foreground))]'
                )}
              >
                {originalPrice}
              </span>
            )}
            {salePrice && (
              <span
                className={cn(
                  'text-4xl font-bold sm:text-5xl',
                  hasBackground ? 'text-white' : 'text-[hsl(var(--portal-primary))]'
                )}
              >
                {salePrice}
              </span>
            )}
            {savingsText && (
              <span
                className={cn(
                  'rounded-full px-4 py-1 text-sm font-bold',
                  'bg-green-500 text-white'
                )}
              >
                {savingsText}
              </span>
            )}
          </div>
        )}

        {/* Buttons */}
        {(primaryButton || secondaryButton) && (
          <div
            className={cn(
              'mt-10 flex animate-fade-in-up flex-wrap gap-4',
              textAlignment === 'center' && 'justify-center',
              textAlignment === 'right' && 'justify-end'
            )}
            style={{ animationDelay: '300ms' }}
          >
            {primaryButton && <PromoCTAButton config={primaryButton} variant="primary" />}
            {secondaryButton && (
              <PromoCTAButton config={secondaryButton} variant="secondary" />
            )}
          </div>
        )}

        {/* Trust Badges */}
        {trustBadges && trustBadges.length > 0 && (
          <div
            className="mt-8 flex animate-fade-in-up flex-wrap items-center justify-center gap-6"
            style={{ animationDelay: '350ms' }}
          >
            {trustBadges.map((badge, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  hasBackground ? 'text-white/70' : 'text-[hsl(var(--portal-muted-foreground))]'
                )}
              >
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {badge}
              </div>
            ))}
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
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.25;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}
