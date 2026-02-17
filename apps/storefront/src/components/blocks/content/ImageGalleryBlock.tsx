/**
 * Image Gallery Block Component
 *
 * Displays a gallery of images in grid or masonry layout
 * with lightbox functionality and optional captions.
 */

'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageGalleryConfig, GalleryImageItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Lightbox Modal Component
 */
function Lightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: GalleryImageItem[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const currentImage = images[currentIndex]

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    },
    [onClose, onPrev, onNext]
  )

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/90 backdrop-blur-sm'
      )}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          'absolute right-4 top-4 z-10',
          'flex h-12 w-12 items-center justify-center rounded-full',
          'bg-white/10 text-white',
          'transition-all hover:bg-white/20'
        )}
        aria-label="Close lightbox"
      >
        <LucideIcon name="X" className="h-6 w-6" />
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          className={cn(
            'absolute left-4 top-1/2 z-10 -translate-y-1/2',
            'flex h-12 w-12 items-center justify-center rounded-full',
            'bg-white/10 text-white',
            'transition-all hover:bg-white/20'
          )}
          aria-label="Previous image"
        >
          <LucideIcon name="ChevronLeft" className="h-6 w-6" />
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className={cn(
            'absolute right-4 top-1/2 z-10 -translate-y-1/2',
            'flex h-12 w-12 items-center justify-center rounded-full',
            'bg-white/10 text-white',
            'transition-all hover:bg-white/20'
          )}
          aria-label="Next image"
        >
          <LucideIcon name="ChevronRight" className="h-6 w-6" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-h-[85vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {currentImage && (
          <>
            <Image
              src={currentImage.src}
              alt={currentImage.alt}
              width={currentImage.width || 1200}
              height={currentImage.height || 800}
              className="max-h-[85vh] w-auto object-contain"
              priority
            />

            {/* Caption */}
            {currentImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3 text-center text-white">
                <p className="text-sm">{currentImage.caption}</p>
              </div>
            )}
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Gallery Image Item Component
 */
function GalleryItem({
  image,
  index,
  showCaptions,
  enableLightbox,
  onOpenLightbox,
  layout,
}: {
  image: GalleryImageItem
  index: number
  showCaptions: boolean
  enableLightbox: boolean
  onOpenLightbox: (index: number) => void
  layout: 'grid' | 'masonry'
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl',
        'bg-[hsl(var(--portal-muted))]',
        'transition-all duration-300',
        'hover:shadow-xl',
        enableLightbox && 'cursor-pointer',
        layout === 'masonry' && 'break-inside-avoid mb-4',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={() => enableLightbox && onOpenLightbox(index)}
      role={enableLightbox ? 'button' : undefined}
      tabIndex={enableLightbox ? 0 : undefined}
      onKeyDown={(e) => {
        if (enableLightbox && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpenLightbox(index)
        }
      }}
      aria-label={enableLightbox ? `Open ${image.alt} in lightbox` : undefined}
    >
      {/* Image */}
      <div className={cn(layout === 'grid' && 'aspect-square', 'relative')}>
        <Image
          src={image.src}
          alt={image.alt}
          {...(layout === 'grid'
            ? { fill: true }
            : { width: image.width || 600, height: image.height || 400 })}
          className={cn(
            'object-cover transition-transform duration-500',
            'group-hover:scale-105',
            layout !== 'grid' && 'w-full h-auto'
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Hover overlay */}
      {enableLightbox && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/0 transition-all duration-300',
            'group-hover:bg-black/40'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              'bg-white/90 text-[hsl(var(--portal-foreground))]',
              'opacity-0 scale-90 transition-all duration-300',
              'group-hover:opacity-100 group-hover:scale-100'
            )}
          >
            <LucideIcon name="ZoomIn" className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Caption */}
      {showCaptions && image.caption && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0',
            'bg-gradient-to-t from-black/80 to-transparent',
            'p-4 pt-8'
          )}
        >
          <p className="text-sm text-white">{image.caption}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Image Gallery Block Component
 */
export function ImageGalleryBlock({ block, className }: BlockProps<ImageGalleryConfig>) {
  const {
    headline,
    subheadline,
    images,
    layout = 'grid',
    columns = 3,
    showCaptions = true,
    enableLightbox = true,
    backgroundColor,
  } = block.config

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
  }

  const goToPrev = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
    )
  }

  const goToNext = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
    )
  }

  // Column classes
  const gridColumnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }

  const masonryColumnClasses = {
    2: 'columns-1 sm:columns-2',
    3: 'columns-1 sm:columns-2 lg:columns-3',
    4: 'columns-2 sm:columns-3 lg:columns-4',
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
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

        {/* Gallery */}
        {images.length > 0 ? (
          layout === 'grid' ? (
            // Grid layout
            <div className={cn('grid gap-4', gridColumnClasses[columns] || gridColumnClasses[3])}>
              {images.map((image, index) => (
                <GalleryItem
                  key={image.id}
                  image={image}
                  index={index}
                  showCaptions={showCaptions}
                  enableLightbox={enableLightbox}
                  onOpenLightbox={openLightbox}
                  layout={layout}
                />
              ))}
            </div>
          ) : (
            // Masonry layout
            <div className={cn('gap-4', masonryColumnClasses[columns] || masonryColumnClasses[3])}>
              {images.map((image, index) => (
                <GalleryItem
                  key={image.id}
                  image={image}
                  index={index}
                  showCaptions={showCaptions}
                  enableLightbox={enableLightbox}
                  onOpenLightbox={openLightbox}
                  layout={layout}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-16 text-center">
            <LucideIcon
              name="Images"
              className="mx-auto h-12 w-12 text-[hsl(var(--portal-muted-foreground))]"
            />
            <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
              No images to display.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && enableLightbox && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
