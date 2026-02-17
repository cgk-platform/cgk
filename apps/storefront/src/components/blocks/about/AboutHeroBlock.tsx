'use client'

/**
 * About Hero Block Component
 *
 * Hero section for about pages with headline, description,
 * optional background image, and decorative patterns.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, AboutHeroConfig, ButtonConfig } from '../types'

/**
 * Height class mapping
 */
const heightClasses = {
  sm: 'min-h-[40vh]',
  md: 'min-h-[50vh]',
  lg: 'min-h-[60vh]',
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
 * CTA Button component
 */
function CTAButton({ config }: { config: ButtonConfig }) {
  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2',
    'px-6 py-3 rounded-lg font-medium',
    'transition-all duration-300',
    'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
    'hover:bg-[hsl(var(--portal-primary))]/90',
    'shadow-lg hover:shadow-xl hover:-translate-y-0.5',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-[hsl(var(--portal-primary))]'
  )

  if (config.href) {
    return (
      <Link
        href={config.href}
        className={buttonClasses}
        {...(config.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {config.text}
      </Link>
    )
  }

  return <button className={buttonClasses}>{config.text}</button>
}

/**
 * Decorative pattern overlay
 */
function PatternOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full bg-[hsl(var(--portal-primary))]/10 blur-[100px]" />
      <div className="absolute -bottom-1/4 -right-1/4 h-[50vh] w-[50vh] rounded-full bg-[hsl(var(--portal-accent))]/10 blur-[80px]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--portal-foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--portal-foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

/**
 * About Hero Block Component
 */
export function AboutHeroBlock({ block, className }: BlockProps<AboutHeroConfig>) {
  const {
    headline,
    subheadline,
    description,
    backgroundImage,
    backgroundColor,
    overlayOpacity = 0.5,
    textAlignment = 'center',
    button,
    badge,
    height = 'md',
    showPattern = true,
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

      {/* Decorative Pattern */}
      {showPattern && !backgroundImage?.src && <PatternOverlay />}

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
              {badge}
            </span>
          </div>
        )}

        {/* Headline */}
        <h1
          className={cn(
            'animate-fade-in-up font-bold tracking-tight',
            'text-4xl sm:text-5xl md:text-6xl',
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

        {/* Button */}
        {button && (
          <div
            className="mt-10 animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <CTAButton config={button} />
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
