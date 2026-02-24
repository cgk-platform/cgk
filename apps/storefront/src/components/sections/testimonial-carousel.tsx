/**
 * Testimonial Carousel Section
 *
 * Customer review testimonials in a scrolling carousel.
 * Uses CSS overflow-x scroll for simplicity.
 */

'use client'

import { useRef } from 'react'

interface Testimonial {
  name: string
  rating: number
  text: string
  product?: string
}

interface TestimonialCarouselProps {
  title?: string
  subtitle?: string
  testimonials: Testimonial[]
  ctaText?: string
  ctaHref?: string
}

export function TestimonialCarousel({
  title = 'The Sheets Everyone Is Talking About',
  subtitle,
  testimonials,
  ctaText,
  ctaHref,
}: TestimonialCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return
    const amount = 340
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (testimonials.length === 0) return null

  return (
    <section className="bg-cgk-cream py-16">
      <div className="mx-auto max-w-store px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="whitespace-pre-line text-2xl font-bold text-cgk-navy md:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-gray-600">{subtitle}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-cgk-navy/20 transition-colors hover:bg-cgk-navy hover:text-white"
              aria-label="Previous testimonials"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-cgk-navy/20 transition-colors hover:bg-cgk-navy hover:text-white"
              aria-label="Next testimonials"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-4"
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="w-80 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-6"
            >
              {/* Stars */}
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg
                    key={s}
                    className={`h-4 w-4 ${s < t.rating ? 'text-cgk-gold' : 'text-gray-200'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-gray-700">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-sm font-semibold text-cgk-navy">{t.name}</p>
                {t.product && (
                  <p className="text-xs text-gray-500">{t.product}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {ctaText && ctaHref && (
          <div className="mt-8 text-center">
            <a
              href={ctaHref}
              className="inline-block rounded-lg border-2 border-cgk-navy px-8 py-3 text-sm font-semibold text-cgk-navy transition-colors hover:bg-cgk-navy hover:text-white"
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
