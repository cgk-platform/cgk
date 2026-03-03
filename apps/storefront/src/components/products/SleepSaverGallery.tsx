/**
 * SleepSaverGallery Component
 *
 * Custom product image gallery matching Figma design for SleepSaver product.
 *
 * Desktop Layout (1440px):
 * - Vertical thumbnail strip on left (90x90px each, 9 images max visible)
 * - Main image on right (650x650px)
 * - Fade gradient at bottom of thumbnails if more than 9 images
 *
 * Mobile Layout (360px):
 * - Large main image at top (320x320px - full width minus padding)
 * - Horizontal scrolling thumbnail strip below (55x55px each)
 * - Fade gradient on right edge
 *
 * Features:
 * - BEST SELLER badge overlay
 * - PERMANENTLY INSTALLED circular sticker
 * - Watch Installation button
 */

'use client'

import type { ProductImage } from '@cgk-platform/commerce'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { useState } from 'react'

interface SleepSaverGalleryProps {
  images: ProductImage[]
  productTitle: string
  onWatchInstallation?: () => void
}

export function SleepSaverGallery({
  images,
  productTitle,
  onWatchInstallation,
}: SleepSaverGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (images.length === 0) {
    return <div className="aspect-square rounded-2xl bg-meliusly-light-gray" />
  }

  const selectedImage = images[selectedIndex]
  const maxVisibleThumbnails = 9
  const showThumbnailFade = images.length > maxVisibleThumbnails

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      {/* Desktop: Vertical Thumbnail Strip (Left Side) */}
      {images.length > 1 && (
        <div className="hidden lg:block lg:w-[90px]">
          <div className="relative">
            <div className="scrollbar-hide flex max-h-[650px] flex-col gap-2 overflow-y-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`relative h-[90px] w-[90px] flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                    i === selectedIndex
                      ? 'border-2 border-meliusly-primary'
                      : 'border border-[rgba(34,34,34,0.1)] hover:border-meliusly-primary/50'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? `${productTitle} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="90px"
                  />
                </button>
              ))}
            </div>

            {/* Fade gradient at bottom if more than 9 images */}
            {showThumbnailFade && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
        </div>
      )}

      {/* Main Image Container */}
      <div className="flex-1">
        <div className="relative aspect-square max-w-[650px] overflow-hidden rounded-2xl bg-meliusly-light-gray lg:h-[650px] lg:w-[650px]">
          <Image
            src={selectedImage.url}
            alt={selectedImage.altText ?? productTitle}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 650px"
            priority
          />

          {/* BEST SELLER Badge - Top Left */}
          <div className="absolute left-0 top-6 z-10">
            <div className="relative bg-meliusly-primary py-2 pl-4 pr-6 text-white">
              <span className="font-manrope text-[11px] font-bold uppercase tracking-wide">
                BEST SELLER
              </span>
              {/* Flag triangle */}
              <div className="absolute -right-0 top-0 h-0 w-0 border-l-[12px] border-t-[18px] border-l-transparent border-t-meliusly-primary" />
              <div className="absolute -right-0 bottom-0 h-0 w-0 border-b-[18px] border-l-[12px] border-b-meliusly-primary border-l-transparent" />
            </div>
          </div>

          {/* PERMANENTLY INSTALLED Circular Badge - Left Side */}
          <div className="absolute left-[15%] top-[40%] z-10 hidden lg:block">
            <div className="flex h-[90px] w-[90px] items-center justify-center rounded-full border-2 border-meliusly-primary bg-meliusly-light-blue">
              <div className="text-center">
                <div className="font-manrope text-[10px] font-semibold uppercase leading-tight text-meliusly-primary">
                  PERMANENTLY
                </div>
                <div className="font-manrope text-[10px] font-semibold uppercase leading-tight text-meliusly-primary">
                  INSTALLED
                </div>
              </div>
            </div>
          </div>

          {/* Watch Installation Button - Bottom Right */}
          {onWatchInstallation && (
            <button
              type="button"
              onClick={onWatchInstallation}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-meliusly-light-blue px-4 py-3 transition-all hover:bg-meliusly-light-blue/80 hover:shadow-md"
            >
              <Play className="h-4 w-4 fill-meliusly-primary text-meliusly-primary" />
              <span className="font-manrope text-sm font-medium text-meliusly-primary">
                Watch Installation
              </span>
            </button>
          )}
        </div>

        {/* Mobile: Horizontal Thumbnail Strip (Below Main Image) */}
        {images.length > 1 && (
          <div className="relative mt-3 lg:hidden">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`relative h-[55px] w-[55px] flex-shrink-0 overflow-hidden rounded transition-all ${
                    i === selectedIndex
                      ? 'border-2 border-meliusly-primary'
                      : 'border border-[rgba(34,34,34,0.1)] hover:border-meliusly-primary/50'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? `${productTitle} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="55px"
                  />
                </button>
              ))}
            </div>

            {/* Fade gradient on right edge */}
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-12 bg-gradient-to-l from-white to-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}

export default SleepSaverGallery
