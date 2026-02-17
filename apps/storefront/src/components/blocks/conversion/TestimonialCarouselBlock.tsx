'use client'

/**
 * Testimonial Carousel Block Component
 *
 * Auto-rotating carousel of customer testimonials with photos,
 * ratings, and navigation controls.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Testimonial item
 */
export interface TestimonialItem {
  id: string
  quote: string
  author: string
  title?: string
  company?: string
  avatar?: ImageConfig
  rating?: number
  featured?: boolean
}

/**
 * Testimonial Carousel block configuration
 */
export interface TestimonialCarouselBlockConfig {
  headline?: string
  subheadline?: string
  testimonials: TestimonialItem[]
  autoRotate?: boolean
  autoRotateInterval?: number
  pauseOnHover?: boolean
  showDots?: boolean
  showArrows?: boolean
  showRatings?: boolean
  itemsPerView?: 1 | 2 | 3
  backgroundColor?: string
}

/**
 * Star rating display
 */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <LucideIcon
          key={star}
          name="Star"
          className={cn(
            'h-4 w-4',
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
 * Individual testimonial card
 */
function TestimonialCard({
  testimonial,
  showRating = true,
  isActive = false,
}: {
  testimonial: TestimonialItem
  showRating?: boolean
  isActive?: boolean
}) {
  return (
    <article
      className={cn(
        'relative flex flex-col h-full p-8 rounded-2xl',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-500',
        isActive && 'shadow-xl scale-[1.02]',
        !isActive && 'opacity-70'
      )}
    >
      {/* Quote icon */}
      <div className="absolute -top-4 left-8">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            'bg-[hsl(var(--portal-primary))]',
            'shadow-lg shadow-[hsl(var(--portal-primary))]/25'
          )}
        >
          <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>
      </div>

      {/* Rating */}
      {showRating && testimonial.rating !== undefined && (
        <div className="mt-4 mb-4">
          <StarRating rating={testimonial.rating} />
        </div>
      )}

      {/* Quote */}
      <blockquote className="flex-1 text-lg leading-relaxed text-[hsl(var(--portal-foreground))] italic">
        "{testimonial.quote}"
      </blockquote>

      {/* Author */}
      <div className="mt-6 flex items-center gap-4 border-t border-[hsl(var(--portal-border))] pt-6">
        {testimonial.avatar?.src ? (
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-[hsl(var(--portal-primary))]/20">
            <Image
              src={testimonial.avatar.src}
              alt={testimonial.author}
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
            {testimonial.author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-[hsl(var(--portal-foreground))]">
            {testimonial.author}
          </p>
          {(testimonial.title || testimonial.company) && (
            <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              {testimonial.title}
              {testimonial.title && testimonial.company && ' at '}
              {testimonial.company}
            </p>
          )}
        </div>
      </div>

      {/* Featured badge */}
      {testimonial.featured && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <LucideIcon name="Award" className="h-3 w-3" />
            Featured
          </span>
        </div>
      )}
    </article>
  )
}

/**
 * Navigation button
 */
function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:bg-[hsl(var(--portal-primary))] hover:text-white hover:border-[hsl(var(--portal-primary))]',
        'hover:shadow-lg',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[hsl(var(--portal-card))]',
        'disabled:hover:text-inherit disabled:hover:border-[hsl(var(--portal-border))]'
      )}
      aria-label={direction === 'prev' ? 'Previous testimonial' : 'Next testimonial'}
    >
      <LucideIcon
        name={direction === 'prev' ? 'ChevronLeft' : 'ChevronRight'}
        className="h-5 w-5"
      />
    </button>
  )
}

/**
 * Testimonial Carousel Block Component
 */
export function TestimonialCarouselBlock({ block, className }: BlockProps<TestimonialCarouselBlockConfig>) {
  const {
    headline,
    subheadline,
    testimonials,
    autoRotate = true,
    autoRotateInterval = 5000,
    pauseOnHover = true,
    showDots = true,
    showArrows = true,
    showRatings = true,
    itemsPerView = 1,
    backgroundColor,
  } = block.config

  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalSlides = Math.ceil(testimonials.length / itemsPerView)

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides)
  }, [totalSlides])

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  const goToSlide = (index: number) => {
    setActiveIndex(index)
  }

  // Auto-rotate effect
  useEffect(() => {
    if (autoRotate && !isPaused && totalSlides > 1) {
      intervalRef.current = setInterval(goToNext, autoRotateInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRotate, autoRotateInterval, isPaused, totalSlides, goToNext])

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true)
    }
  }

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false)
    }
  }

  // Get visible testimonials for current slide
  const getVisibleTestimonials = () => {
    const startIndex = activeIndex * itemsPerView
    return testimonials.slice(startIndex, startIndex + itemsPerView)
  }

  const itemsPerViewClasses = {
    1: 'grid-cols-1 max-w-2xl mx-auto',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Carousel container */}
        <div className="relative">
          {/* Arrow navigation - left */}
          {showArrows && totalSlides > 1 && (
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10">
              <NavButton direction="prev" onClick={goToPrev} />
            </div>
          )}

          {/* Testimonials grid */}
          <div className={cn('grid gap-6', itemsPerViewClasses[itemsPerView])}>
            {getVisibleTestimonials().map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                showRating={showRatings}
                isActive={true}
              />
            ))}
          </div>

          {/* Arrow navigation - right */}
          {showArrows && totalSlides > 1 && (
            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10">
              <NavButton direction="next" onClick={goToNext} />
            </div>
          )}
        </div>

        {/* Mobile arrows and dots */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {/* Mobile arrows */}
          {showArrows && totalSlides > 1 && (
            <div className="flex gap-2 md:hidden">
              <NavButton direction="prev" onClick={goToPrev} />
              <NavButton direction="next" onClick={goToNext} />
            </div>
          )}

          {/* Dot navigation */}
          {showDots && totalSlides > 1 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    index === activeIndex
                      ? 'w-8 h-3 bg-[hsl(var(--portal-primary))]'
                      : 'w-3 h-3 bg-[hsl(var(--portal-muted))] hover:bg-[hsl(var(--portal-primary))]/50'
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                  aria-current={index === activeIndex ? 'true' : 'false'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Auto-rotate indicator */}
        {autoRotate && totalSlides > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {isPaused ? (
              <>
                <LucideIcon name="Pause" className="h-4 w-4" />
                <span>Paused</span>
              </>
            ) : (
              <>
                <LucideIcon name="Play" className="h-4 w-4" />
                <span>Auto-rotating</span>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
