/**
 * Product Media Gallery
 *
 * Embla Carousel-powered image gallery with swipe/drag navigation,
 * thumbnail strip sync, and desktop hover arrow buttons. Supports
 * color-based image filtering (matches image alt text to selected color variant).
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import type { ProductImage } from '@cgk-platform/commerce'

interface MediaGalleryProps {
  images: ProductImage[]
  productTitle: string
  selectedColor?: string
}

export function MediaGallery({
  images,
  productTitle,
  selectedColor,
}: MediaGalleryProps) {
  const filteredImages = useMemo(() => {
    if (!selectedColor || images.length <= 1) return images

    // Filter images by alt text matching selected color
    const colorFiltered = images.filter((img) => {
      const alt = (img.altText ?? '').toLowerCase()
      return alt.includes(selectedColor.toLowerCase())
    })

    return colorFiltered.length > 0 ? colorFiltered : images
  }, [images, selectedColor])

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  // Reset to first slide when filtered images change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0)
    }
  }, [filteredImages, emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  if (filteredImages.length === 0) {
    return <div className="aspect-square rounded-lg bg-gray-100" />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Carousel */}
      <div className="group relative overflow-hidden rounded-lg bg-gray-50">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {filteredImages.map((img, i) => (
              <div
                key={img.id}
                className="relative aspect-square min-w-0 flex-[0_0_100%]"
              >
                <Image
                  src={img.url}
                  alt={img.altText ?? productTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows (hidden on mobile, visible on desktop hover) */}
        {filteredImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 opacity-0 shadow-md transition-opacity hover:bg-white disabled:invisible group-hover:opacity-100 md:block"
              aria-label="Previous image"
            >
              <svg
                className="h-5 w-5 text-cgk-navy"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 opacity-0 shadow-md transition-opacity hover:bg-white disabled:invisible group-hover:opacity-100 md:block"
              aria-label="Next image"
            >
              <svg
                className="h-5 w-5 text-cgk-navy"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {filteredImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => scrollTo(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                i === selectedIndex
                  ? 'border-cgk-navy'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${productTitle} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
