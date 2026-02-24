/**
 * Press Slider Section
 *
 * "In The News" carousel showing press mentions with publication logos and quotes.
 * Uses embla-carousel-react for swipe navigation.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'

interface PressItem {
  publication: string
  logoSrc?: string
  quote: string
  url?: string
}

interface PressSliderProps {
  items: PressItem[]
  title?: string
}

export function PressSlider({ items, title = 'In The News' }: PressSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 3 },
    },
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setScrollSnaps(emblaApi.scrollSnapList())
    onSelect()
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  if (items.length === 0) return null

  return (
    <section className="bg-cgk-light-blue/10 py-16">
      <div className="mx-auto max-w-store px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-cgk-navy">{title}</h2>

        <div className="relative">
          {/* Carousel */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {items.map((item, i) => (
                <div key={i} className="min-w-0 flex-[0_0_100%] px-3 md:flex-[0_0_50%] lg:flex-[0_0_33.333%]">
                  <div className="flex h-full flex-col items-center rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                    {/* Publication Logo or Name */}
                    {item.logoSrc ? (
                      <div className="mb-4 h-8">
                        <Image
                          src={item.logoSrc}
                          alt={item.publication}
                          width={120}
                          height={32}
                          className="h-8 w-auto object-contain opacity-60"
                        />
                      </div>
                    ) : (
                      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                        {item.publication}
                      </p>
                    )}

                    {/* Quote */}
                    <blockquote className="flex-1 text-sm italic leading-relaxed text-gray-600">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>

                    {/* Read More Link */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 text-xs font-medium text-cgk-navy hover:underline"
                      >
                        Read Article
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50 focus:outline-none"
            aria-label="Previous"
          >
            <svg className="h-5 w-5 text-cgk-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50 focus:outline-none"
            aria-label="Next"
          >
            <svg className="h-5 w-5 text-cgk-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dot Indicators */}
        {scrollSnaps.length > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === selectedIndex
                    ? 'w-6 bg-cgk-navy'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
