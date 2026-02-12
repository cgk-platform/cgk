/**
 * Testimonial Block Component
 *
 * Single featured testimonial with quote, author info, and optional rating.
 * Supports multiple visual styles: card, minimal, and featured.
 */

import Image from 'next/image'
import { cn } from '@cgk/ui'
import type { BlockProps, TestimonialConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Star rating component
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <LucideIcon
          key={star}
          name="Star"
          className={cn(
            'h-5 w-5',
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-[hsl(var(--portal-muted))] text-[hsl(var(--portal-muted))]'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Card style testimonial
 */
function CardStyle({
  quote,
  author,
  role,
  company,
  avatar,
  rating,
}: TestimonialConfig) {
  return (
    <div
      className={cn(
        'relative mx-auto max-w-2xl rounded-2xl p-8 sm:p-10',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'shadow-lg'
      )}
    >
      {/* Quote icon */}
      <div
        className={cn(
          'absolute -top-4 left-8',
          'flex h-10 w-10 items-center justify-center rounded-xl',
          'bg-[hsl(var(--portal-primary))]',
          'shadow-lg shadow-[hsl(var(--portal-primary))]/20'
        )}
      >
        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>

      {/* Rating */}
      {rating && (
        <div className="mb-6 mt-2">
          <StarRating rating={rating} />
        </div>
      )}

      {/* Quote */}
      <blockquote className="text-xl leading-relaxed text-[hsl(var(--portal-foreground))] sm:text-2xl">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="mt-8 flex items-center gap-4 border-t border-[hsl(var(--portal-border))] pt-6">
        {avatar?.src ? (
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-[hsl(var(--portal-primary))]/20">
            <Image
              src={avatar.src}
              alt={author}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full',
              'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
              'text-lg font-bold text-white'
            )}
          >
            {author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-semibold text-[hsl(var(--portal-foreground))]">
            {author}
          </div>
          {(role || company) && (
            <div className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              {role}
              {role && company && ' at '}
              {company && <span className="font-medium">{company}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal style testimonial
 */
function MinimalStyle({
  quote,
  author,
  role,
  company,
  rating,
}: TestimonialConfig) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {/* Rating */}
      {rating && (
        <div className="mb-6 flex justify-center">
          <StarRating rating={rating} />
        </div>
      )}

      {/* Quote */}
      <blockquote className="text-2xl font-medium leading-relaxed text-[hsl(var(--portal-foreground))] sm:text-3xl lg:text-4xl">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="mt-8">
        <div className="font-semibold text-[hsl(var(--portal-foreground))]">
          {author}
        </div>
        {(role || company) && (
          <div className="text-[hsl(var(--portal-muted-foreground))]">
            {role}
            {role && company && ', '}
            {company}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Featured style testimonial
 */
function FeaturedStyle({
  quote,
  author,
  role,
  company,
  avatar,
  rating,
}: TestimonialConfig) {
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
      {/* Avatar section */}
      <div className="relative">
        {/* Decorative elements */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[hsl(var(--portal-primary))]/20 to-transparent blur-2xl" />

        <div className="relative aspect-square max-w-md overflow-hidden rounded-3xl">
          {avatar?.src ? (
            <Image
              src={avatar.src}
              alt={author}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div
              className={cn(
                'flex h-full items-center justify-center',
                'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
                'text-8xl font-bold text-white'
              )}
            >
              {author.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Quote icon decoration */}
        <div
          className={cn(
            'absolute -bottom-4 -right-4 flex h-16 w-16 items-center justify-center rounded-2xl',
            'bg-[hsl(var(--portal-primary))]',
            'shadow-xl shadow-[hsl(var(--portal-primary))]/30'
          )}
        >
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
      </div>

      {/* Content section */}
      <div>
        {/* Rating */}
        {rating && (
          <div className="mb-6">
            <StarRating rating={rating} />
          </div>
        )}

        {/* Quote */}
        <blockquote className="text-2xl font-medium leading-relaxed text-[hsl(var(--portal-foreground))] sm:text-3xl">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {/* Author info */}
        <div className="mt-8 border-l-4 border-[hsl(var(--portal-primary))] pl-6">
          <div className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
            {author}
          </div>
          {(role || company) && (
            <div className="mt-1 text-lg text-[hsl(var(--portal-muted-foreground))]">
              {role}
              {role && company && ' at '}
              {company && <span className="font-medium">{company}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Testimonial Block Component
 */
export function TestimonialBlock({ block, className }: BlockProps<TestimonialConfig>) {
  const { style = 'card', backgroundColor, ...testimonialProps } = block.config

  const StyleComponent = {
    card: CardStyle,
    minimal: MinimalStyle,
    featured: FeaturedStyle,
  }[style]

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <StyleComponent {...testimonialProps} />
      </div>
    </section>
  )
}
