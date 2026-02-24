/**
 * Product Media Gallery
 *
 * Embla Carousel-powered image gallery with swipe/drag navigation,
 * thumbnail strip sync, desktop hover arrow buttons, and click-to-zoom
 * lightbox overlay matching the Dawn theme's image_zoom: "lightbox" setting.
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

function ImageLightbox({
  image,
  alt,
  onClose,
}: {
  image: ProductImage
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={image.url}
          alt={alt}
          width={image.width ?? 1600}
          height={image.height ?? 1600}
          className="max-h-[90vh] w-auto object-contain"
          sizes="90vw"
          priority
        />
      </div>
    </div>
  )
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
  const [lightboxOpen, setLightboxOpen] = useState(false)

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

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  if (filteredImages.length === 0) {
    return <div className="aspect-square rounded-lg bg-gray-100" />
  }

  const currentImage = filteredImages[selectedIndex]

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Main Image Carousel */}
        <div className="group relative overflow-hidden rounded-lg bg-gray-50">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {filteredImages.map((img, i) => (
                <div
                  key={img.id}
                  className="relative aspect-square min-w-0 flex-[0_0_100%] cursor-zoom-in"
                  onClick={() => setLightboxOpen(true)}
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

          {/* Zoom hint icon */}
          <div className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <svg className="h-4 w-4 text-cgk-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>

          {/* Navigation Arrows (hidden on mobile, visible on desktop hover) */}
          {filteredImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  emblaApi?.scrollPrev()
                }}
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
                onClick={(e) => {
                  e.stopPropagation()
                  emblaApi?.scrollNext()
                }}
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

      {/* Lightbox Overlay */}
      {lightboxOpen && currentImage && (
        <ImageLightbox
          image={currentImage}
          alt={currentImage.altText ?? productTitle}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  )
}
