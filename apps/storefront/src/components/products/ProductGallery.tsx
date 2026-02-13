/**
 * ProductGallery Component
 *
 * Image gallery for product detail pages with thumbnails and zoom.
 * Supports mobile swipe and keyboard navigation.
 */

'use client'

import type { ProductImage } from '@cgk-platform/commerce'
import { cn } from '@cgk-platform/ui'
import Image from 'next/image'
import { useState, useCallback } from 'react'

interface ProductGalleryProps {
  images: ProductImage[]
  productTitle: string
  className?: string
}

export function ProductGallery({
  images,
  productTitle,
  className,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const selectedImage = images[selectedIndex]

  const handlePrevious = useCallback(() => {
    setSelectedIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    )
  }, [images.length])

  const handleNext = useCallback(() => {
    setSelectedIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    )
  }, [images.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    },
    [handlePrevious, handleNext]
  )

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'flex aspect-square items-center justify-center rounded-lg bg-muted',
          className
        )}
      >
        <svg
          className="h-24 w-24 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Main Image */}
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Product image gallery"
      >
        {selectedImage && (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setIsZoomed(true)}
            aria-label="Zoom image"
          >
            <Image
              src={selectedImage.url}
              alt={selectedImage.altText ?? `${productTitle} - Image ${selectedIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </button>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-all hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Previous image"
            >
              <svg
                className="h-5 w-5"
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
              onClick={handleNext}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-all hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Next image"
            >
              <svg
                className="h-5 w-5"
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

        {/* Image Counter (Mobile) */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white md:hidden">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Product image thumbnails"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-20 md:w-20',
                index === selectedIndex
                  ? 'border-primary'
                  : 'border-transparent hover:border-gray-300'
              )}
              role="tab"
              aria-selected={index === selectedIndex}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.altText ?? `${productTitle} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsZoomed(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsZoomed(false)
            if (e.key === 'ArrowLeft') handlePrevious()
            if (e.key === 'ArrowRight') handleNext()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          tabIndex={0}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close zoom"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative h-[90vh] w-[90vw]">
            <Image
              src={selectedImage.url}
              alt={selectedImage.altText ?? productTitle}
              fill
              sizes="90vw"
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Navigation in zoom mode */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                aria-label="Previous image"
              >
                <svg
                  className="h-8 w-8"
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
                  handleNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                aria-label="Next image"
              >
                <svg
                  className="h-8 w-8"
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
      )}
    </div>
  )
}

export default ProductGallery
