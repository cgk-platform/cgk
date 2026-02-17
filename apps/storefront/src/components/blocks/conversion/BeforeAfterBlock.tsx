'use client'

/**
 * Before/After Block Component
 *
 * Interactive image comparison slider with draggable divider.
 * Supports touch, horizontal/vertical orientation, and custom labels.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Before/After block configuration
 */
export interface BeforeAfterBlockConfig {
  headline?: string
  subheadline?: string
  description?: string
  beforeImage: ImageConfig
  afterImage: ImageConfig
  beforeLabel?: string
  afterLabel?: string
  orientation?: 'horizontal' | 'vertical'
  initialPosition?: number
  showLabels?: boolean
  labelPosition?: 'inside' | 'outside'
  backgroundColor?: string
}

/**
 * Before/After Block Component
 */
export function BeforeAfterBlock({ block, className }: BlockProps<BeforeAfterBlockConfig>) {
  const {
    headline,
    subheadline,
    description,
    beforeImage,
    afterImage,
    beforeLabel = 'Before',
    afterLabel = 'After',
    orientation = 'horizontal',
    initialPosition = 50,
    showLabels = true,
    labelPosition = 'inside',
    backgroundColor,
  } = block.config

  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  const isHorizontal = orientation === 'horizontal'

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      let newPosition: number

      if (isHorizontal) {
        newPosition = ((clientX - rect.left) / rect.width) * 100
      } else {
        newPosition = ((clientY - rect.top) / rect.height) * 100
      }

      // Clamp between 0 and 100
      newPosition = Math.max(0, Math.min(100, newPosition))
      setPosition(newPosition)
    },
    [isHorizontal]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleMove(e.clientX, e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const touch = e.touches[0]
    if (touch) {
      handleMove(touch.clientX, touch.clientY)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (isDragging && touch) {
        handleMove(touch.clientX, touch.clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleMove])

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 2
    if (isHorizontal) {
      if (e.key === 'ArrowLeft') {
        setPosition((prev) => Math.max(0, prev - step))
      } else if (e.key === 'ArrowRight') {
        setPosition((prev) => Math.min(100, prev + step))
      }
    } else {
      if (e.key === 'ArrowUp') {
        setPosition((prev) => Math.max(0, prev - step))
      } else if (e.key === 'ArrowDown') {
        setPosition((prev) => Math.min(100, prev + step))
      }
    }
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline || description) && (
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
            {description && (
              <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Labels outside */}
        {showLabels && labelPosition === 'outside' && (
          <div
            className={cn(
              'flex mb-4',
              isHorizontal ? 'justify-between' : 'flex-col items-center gap-2'
            )}
          >
            <span className="px-4 py-1.5 rounded-full bg-[hsl(var(--portal-muted))] text-sm font-medium">
              {beforeLabel}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-[hsl(var(--portal-muted))] text-sm font-medium">
              {afterLabel}
            </span>
          </div>
        )}

        {/* Comparison container */}
        <div
          ref={containerRef}
          className={cn(
            'relative overflow-hidden rounded-2xl select-none',
            'border border-[hsl(var(--portal-border))]',
            'shadow-xl',
            isHorizontal ? 'aspect-video' : 'aspect-[3/4] max-h-[70vh]',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="slider"
          tabIndex={0}
          aria-valuenow={Math.round(position)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Before and after comparison slider"
          onKeyDown={handleKeyDown}
        >
          {/* After image (bottom layer) */}
          <div className="absolute inset-0">
            <Image
              src={afterImage.src}
              alt={afterImage.alt || 'After'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority={afterImage.priority}
            />
          </div>

          {/* Before image (top layer, clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={
              isHorizontal
                ? { clipPath: `inset(0 ${100 - position}% 0 0)` }
                : { clipPath: `inset(0 0 ${100 - position}% 0)` }
            }
          >
            <Image
              src={beforeImage.src}
              alt={beforeImage.alt || 'Before'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority={beforeImage.priority}
            />
          </div>

          {/* Divider line */}
          <div
            className={cn(
              'absolute z-10 bg-white shadow-lg',
              isHorizontal
                ? 'top-0 bottom-0 w-1 -translate-x-1/2'
                : 'left-0 right-0 h-1 -translate-y-1/2'
            )}
            style={
              isHorizontal
                ? { left: `${position}%` }
                : { top: `${position}%` }
            }
          >
            {/* Drag handle */}
            <div
              className={cn(
                'absolute flex items-center justify-center',
                'bg-white rounded-full shadow-lg',
                'w-12 h-12',
                isDragging
                  ? 'ring-4 ring-[hsl(var(--portal-primary))]/30 scale-110'
                  : 'hover:scale-105',
                'transition-transform duration-200',
                isHorizontal
                  ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                  : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-0.5',
                  !isHorizontal && 'rotate-90'
                )}
              >
                <LucideIcon
                  name="ChevronLeft"
                  className="h-5 w-5 text-[hsl(var(--portal-foreground))]"
                />
                <LucideIcon
                  name="ChevronRight"
                  className="h-5 w-5 text-[hsl(var(--portal-foreground))]"
                />
              </div>
            </div>
          </div>

          {/* Labels inside */}
          {showLabels && labelPosition === 'inside' && (
            <>
              <div
                className={cn(
                  'absolute z-20 pointer-events-none',
                  isHorizontal ? 'top-4 left-4' : 'top-4 left-1/2 -translate-x-1/2'
                )}
              >
                <span
                  className={cn(
                    'inline-flex px-3 py-1.5 rounded-full',
                    'bg-black/60 text-white backdrop-blur-sm',
                    'text-sm font-medium'
                  )}
                >
                  {beforeLabel}
                </span>
              </div>
              <div
                className={cn(
                  'absolute z-20 pointer-events-none',
                  isHorizontal ? 'top-4 right-4' : 'bottom-4 left-1/2 -translate-x-1/2'
                )}
              >
                <span
                  className={cn(
                    'inline-flex px-3 py-1.5 rounded-full',
                    'bg-black/60 text-white backdrop-blur-sm',
                    'text-sm font-medium'
                  )}
                >
                  {afterLabel}
                </span>
              </div>
            </>
          )}

          {/* Instructions overlay (shows briefly) */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/20 pointer-events-none',
              'opacity-0 transition-opacity duration-300',
              !isDragging && 'group-hover:opacity-100'
            )}
          >
            <div className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm">
              Drag to compare
            </div>
          </div>
        </div>

        {/* Percentage indicator */}
        <div className="mt-4 flex justify-center">
          <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {Math.round(position)}% / {Math.round(100 - position)}%
          </span>
        </div>
      </div>
    </section>
  )
}
