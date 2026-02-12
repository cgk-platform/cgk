/**
 * Hero Block Component
 *
 * Full-width hero section with headline, description, background image,
 * and call-to-action buttons. Supports multiple height variants and
 * text alignments.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk/ui'
import type { BlockProps, HeroConfig, ButtonConfig } from '../types'

/**
 * Height class mapping for hero variants
 */
const heightClasses = {
  sm: 'min-h-[40vh]',
  md: 'min-h-[60vh]',
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
 * Render a CTA button with proper styling
 */
function CTAButton({
  config,
  variant = 'primary',
}: {
  config: ButtonConfig
  variant?: 'primary' | 'secondary'
}) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[hsl(var(--portal-primary))]'
  )

  const variantClasses =
    variant === 'primary'
      ? cn(
          'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
          'hover:bg-[hsl(var(--portal-primary))]/90',
          'shadow-lg hover:shadow-xl hover:-translate-y-0.5'
        )
      : cn(
          'bg-transparent border-2 border-current',
          'hover:bg-white/10',
          'backdrop-blur-sm'
        )

  const sizeClasses =
    config.size === 'lg'
      ? 'px-8 py-4 text-lg rounded-lg'
      : config.size === 'sm'
        ? 'px-4 py-2 text-sm rounded-md'
        : 'px-6 py-3 text-base rounded-md'

  const buttonContent = (
    <>
      {config.text}
      {variant === 'primary' && (
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
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
        className={cn(baseClasses, variantClasses, sizeClasses)}
        {...(config.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {buttonContent}
      </Link>
    )
  }

  return (
    <button className={cn(baseClasses, variantClasses, sizeClasses)}>
      {buttonContent}
    </button>
  )
}

/**
 * Hero Block Component
 */
export function HeroBlock({ block, className }: BlockProps<HeroConfig>) {
  const {
    headline,
    subheadline,
    description,
    backgroundImage,
    backgroundColor,
    overlayOpacity = 0.5,
    textAlignment = 'center',
    primaryButton,
    secondaryButton,
    badge,
    height = 'lg',
    showScrollIndicator = false,
  } = block.config

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
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      {/* Decorative Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute -left-1/4 -top-1/4 h-[50vh] w-[50vh] rounded-full bg-[hsl(var(--portal-primary))]/10 blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[40vh] w-[40vh] rounded-full bg-[hsl(var(--portal-accent))]/10 blur-[80px]" />
      </div>

      {/* Content */}
      <div
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 py-16 sm:px-8 md:py-24',
          alignmentClasses[textAlignment]
        )}
      >
        {/* Badge */}
        {badge && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5',
                'bg-[hsl(var(--portal-primary))]/10 text-[hsl(var(--portal-primary))]',
                'text-sm font-medium tracking-wide',
                'border border-[hsl(var(--portal-primary))]/20',
                backgroundImage?.src && 'bg-white/10 text-white border-white/20'
              )}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {badge}
            </span>
          </div>
        )}

        {/* Headline */}
        <h1
          className={cn(
            'animate-fade-in-up font-bold tracking-tight',
            'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
            'leading-[1.1]',
            backgroundImage?.src
              ? 'text-white'
              : 'text-[hsl(var(--portal-foreground))]',
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
              backgroundImage?.src
                ? 'text-white/90'
                : 'text-[hsl(var(--portal-primary))]'
            )}
            style={{ animationDelay: '200ms' }}
          >
            {subheadline}
          </p>
        )}

        {/* Description */}
        {description && (
          <p
            className={cn(
              'mt-6 max-w-2xl animate-fade-in-up text-lg leading-relaxed sm:text-xl',
              backgroundImage?.src
                ? 'text-white/80'
                : 'text-[hsl(var(--portal-muted-foreground))]'
            )}
            style={{ animationDelay: '300ms' }}
          >
            {description}
          </p>
        )}

        {/* Buttons */}
        {(primaryButton || secondaryButton) && (
          <div
            className={cn(
              'mt-10 flex animate-fade-in-up flex-wrap gap-4',
              textAlignment === 'center' && 'justify-center',
              textAlignment === 'right' && 'justify-end'
            )}
            style={{ animationDelay: '400ms' }}
          >
            {primaryButton && <CTAButton config={primaryButton} variant="primary" />}
            {secondaryButton && (
              <CTAButton config={secondaryButton} variant="secondary" />
            )}
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div
            className={cn(
              'flex flex-col items-center gap-2',
              backgroundImage?.src
                ? 'text-white/60'
                : 'text-[hsl(var(--portal-muted-foreground))]'
            )}
          >
            <span className="text-xs font-medium uppercase tracking-widest">
              Scroll
            </span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      )}

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
