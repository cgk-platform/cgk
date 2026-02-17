'use client'

/**
 * UGC Banner Block Component
 *
 * Displays user-generated content in a horizontal banner format
 * with customer photos, hashtag display, and a "share your photos" CTA.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import { Camera, Hash, ArrowRight, ExternalLink } from 'lucide-react'
import type { BlockProps, UGCBannerConfig, ImageConfig, ButtonConfig } from '../types'

/**
 * Extended UGC Banner config with additional properties
 */
interface ExtendedUGCBannerConfig extends UGCBannerConfig {
  hashtag?: string
  ctaButton?: ButtonConfig
  scrolling?: boolean
  scrollSpeed?: number
  backgroundColor?: string
}

/**
 * UGC Banner Block Component
 */
export function UGCBannerBlock({ block, className }: BlockProps<ExtendedUGCBannerConfig>) {
  const {
    headline = 'Share Your Photos',
    images = [],
    hashtag,
    instagramHandle,
    ctaButton,
    scrolling = false,
    scrollSpeed = 30,
    columns = 5,
    backgroundColor,
  } = block.config

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-scroll animation
  useEffect(() => {
    if (!scrolling || !scrollRef.current) return

    const scrollContainer = scrollRef.current
    let animationId: number

    const scroll = () => {
      if (isPaused) {
        animationId = requestAnimationFrame(scroll)
        return
      }

      scrollContainer.scrollLeft += 1

      // Reset to start when reaching the end (for seamless loop)
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0
      }

      animationId = requestAnimationFrame(scroll)
    }

    // Start scrolling based on speed (lower = faster)
    const interval = setInterval(() => {
      animationId = requestAnimationFrame(scroll)
    }, 50 / scrollSpeed)

    return () => {
      clearInterval(interval)
      cancelAnimationFrame(animationId)
    }
  }, [scrolling, scrollSpeed, isPaused])

  // For scrolling mode, duplicate images for seamless loop
  const displayImages = scrolling ? [...images, ...images] : images

  const columnClasses = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }

  return (
    <section
      className={cn('py-12 sm:py-16', className)}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
              <Camera className="h-6 w-6 text-[hsl(var(--portal-primary))]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[hsl(var(--portal-foreground))]">
                {headline}
              </h2>
              {hashtag && (
                <div className="mt-1 flex items-center gap-1 text-[hsl(var(--portal-primary))]">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">{hashtag.replace('#', '')}</span>
                </div>
              )}
            </div>
          </div>

          {ctaButton && (
            <Link
              href={ctaButton.href}
              className={cn(
                'group inline-flex items-center gap-2 rounded-lg px-5 py-2.5',
                'bg-[hsl(var(--portal-primary))] text-white',
                'font-medium transition-all duration-300',
                'hover:bg-[hsl(var(--portal-primary))]/90 hover:-translate-y-0.5'
              )}
              {...(ctaButton.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {ctaButton.text}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      {/* Image Row */}
      {scrolling ? (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {displayImages.map((image, index) => (
            <UGCImage key={`${image.src}-${index}`} image={image} index={index} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className={cn('grid gap-3', columnClasses[columns])}>
            {images.slice(0, columns * 2).map((image, index) => (
              <UGCImage key={image.src || index} image={image} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Instagram Handle Link */}
      {instagramHandle && (
        <div className="mx-auto mt-8 max-w-7xl px-6 text-center sm:px-8">
          <Link
            href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-primary))]"
          >
            Tag us {instagramHandle} to be featured
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* CSS for hiding scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}

/**
 * Individual UGC image component
 */
function UGCImage({ image, index }: { image: ImageConfig; index: number }) {
  return (
    <div
      className={cn(
        'animate-fade-in-up group relative aspect-square min-w-[200px] flex-shrink-0 overflow-hidden rounded-lg',
        'bg-[hsl(var(--portal-muted))]'
      )}
      style={{ animationDelay: `${(index % 10) * 50}ms` }}
    >
      {image.src && (
        <Image
          src={image.src}
          alt={image.alt || 'Customer photo'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 200px, 250px"
        />
      )}

      {/* Hover overlay with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  )
}
