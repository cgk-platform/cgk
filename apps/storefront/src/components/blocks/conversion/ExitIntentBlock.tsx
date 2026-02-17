'use client'

/**
 * Exit Intent Block Component
 *
 * Popup configuration block for exit intent detection.
 * This block stores the popup content and configuration.
 * Note: Actual exit intent detection should be handled by the parent component.
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageConfig, ButtonConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Exit Intent block configuration
 */
export interface ExitIntentBlockConfig {
  headline: string
  subheadline?: string
  description?: string
  image?: ImageConfig
  offer?: string
  ctaButton: ButtonConfig
  secondaryButton?: ButtonConfig
  showOncePerSession?: boolean
  delayMs?: number
  cookieDays?: number
  style?: 'modal' | 'slide-in' | 'fullscreen'
  position?: 'center' | 'bottom-right'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  backgroundColor?: string
}

/**
 * Storage key for tracking popup shown state
 */
const STORAGE_KEY = 'cgk_exit_intent_shown'

/**
 * Check if popup was already shown
 */
function wasPopupShown(cookieDays: number): boolean {
  if (typeof window === 'undefined') return true

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return false

  const timestamp = parseInt(stored, 10)
  const now = Date.now()
  const maxAge = cookieDays * 24 * 60 * 60 * 1000

  return now - timestamp < maxAge
}

/**
 * Mark popup as shown
 */
function markPopupShown(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

/**
 * Exit Intent Block Component
 */
export function ExitIntentBlock({ block, className }: BlockProps<ExitIntentBlockConfig>) {
  const {
    headline,
    subheadline,
    description,
    image,
    offer,
    ctaButton,
    secondaryButton,
    showOncePerSession = true,
    delayMs = 0,
    cookieDays = 7,
    style = 'modal',
    position = 'center',
    showCloseButton = true,
    closeOnOverlayClick = true,
    backgroundColor,
  } = block.config

  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      if (showOncePerSession) {
        markPopupShown()
      }
    }, 300)
  }, [showOncePerSession])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Exit intent detection
  useEffect(() => {
    // Check if already shown
    if (showOncePerSession && wasPopupShown(cookieDays)) {
      return
    }

    let timeoutId: NodeJS.Timeout | null = null

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse moves to top of viewport
      if (e.clientY <= 0) {
        if (delayMs > 0) {
          timeoutId = setTimeout(() => setIsVisible(true), delayMs)
        } else {
          setIsVisible(true)
        }
      }
    }

    // Add event listener after initial delay
    const initTimeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave)
    }, 1000) // Wait 1 second before activating

    return () => {
      clearTimeout(initTimeout)
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [showOncePerSession, delayMs, cookieDays])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible, handleClose])

  // Lock body scroll when visible
  useEffect(() => {
    if (isVisible && style !== 'slide-in') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isVisible, style])

  if (!isVisible) return null

  // Slide-in style (bottom right corner)
  if (style === 'slide-in') {
    return (
      <div
        className={cn(
          'fixed z-50',
          position === 'bottom-right'
            ? 'bottom-4 right-4'
            : 'bottom-4 left-1/2 -translate-x-1/2',
          isClosing ? 'animate-slide-out' : 'animate-slide-in',
          className
        )}
      >
        <div
          className={cn(
            'relative w-80 overflow-hidden rounded-2xl',
            'bg-[hsl(var(--portal-card))]',
            'border border-[hsl(var(--portal-border))]',
            'shadow-2xl'
          )}
          style={{ backgroundColor }}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 p-1 rounded-full hover:bg-[hsl(var(--portal-muted))] transition-colors"
              aria-label="Close popup"
            >
              <LucideIcon name="X" className="h-5 w-5 text-[hsl(var(--portal-muted-foreground))]" />
            </button>
          )}

          {/* Image */}
          {image?.src && (
            <div className="relative h-32 w-full">
              <Image
                src={image.src}
                alt={image.alt || ''}
                fill
                className="object-cover"
                sizes="320px"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--portal-card))] to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            {/* Offer badge */}
            {offer && (
              <div className="mb-3">
                <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm font-bold">
                  {offer}
                </span>
              </div>
            )}

            <h3 className="text-lg font-bold text-[hsl(var(--portal-foreground))]">
              {headline}
            </h3>

            {subheadline && (
              <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                {subheadline}
              </p>
            )}

            {/* CTA */}
            <div className="mt-4 space-y-2">
              <Link
                href={ctaButton.href}
                onClick={handleClose}
                className={cn(
                  'block w-full px-4 py-2.5 rounded-lg text-center font-semibold',
                  'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                  'hover:bg-[hsl(var(--portal-primary))]/90 transition-colors'
                )}
              >
                {ctaButton.text}
              </Link>

              {secondaryButton && (
                <Link
                  href={secondaryButton.href}
                  onClick={handleClose}
                  className="block w-full text-center text-sm text-[hsl(var(--portal-muted-foreground))] hover:underline"
                >
                  {secondaryButton.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fullscreen style
  if (style === 'fullscreen') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-primary))]/80',
          isClosing ? 'animate-fade-out' : 'animate-fade-in',
          className
        )}
        onClick={handleOverlayClick}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute right-6 top-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close popup"
          >
            <LucideIcon name="X" className="h-6 w-6 text-white" />
          </button>
        )}

        <div className="relative flex flex-col items-center gap-8 px-6 text-center text-white max-w-2xl">
          {/* Offer badge */}
          {offer && (
            <div className="animate-bounce-slow">
              <span className="inline-flex px-6 py-2 rounded-full bg-white text-[hsl(var(--portal-primary))] text-lg font-bold shadow-xl">
                {offer}
              </span>
            </div>
          )}

          {/* Headline */}
          <h2 className="text-4xl font-bold sm:text-5xl">{headline}</h2>

          {/* Subheadline */}
          {subheadline && (
            <p className="text-xl opacity-90">{subheadline}</p>
          )}

          {/* Description */}
          {description && (
            <p className="text-lg opacity-80 max-w-lg">{description}</p>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={ctaButton.href}
              onClick={handleClose}
              className={cn(
                'px-8 py-4 rounded-xl text-lg font-bold',
                'bg-white text-[hsl(var(--portal-primary))]',
                'hover:bg-white/90 transition-colors',
                'shadow-xl'
              )}
            >
              {ctaButton.text}
            </Link>

            {secondaryButton && (
              <Link
                href={secondaryButton.href}
                onClick={handleClose}
                className={cn(
                  'px-8 py-4 rounded-xl text-lg font-semibold',
                  'bg-white/10 text-white border-2 border-white/30',
                  'hover:bg-white/20 transition-colors'
                )}
              >
                {secondaryButton.text}
              </Link>
            )}
          </div>

          {/* No thanks */}
          <button
            onClick={handleClose}
            className="text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            No thanks, I&apos;ll pass
          </button>
        </div>
      </div>
    )
  }

  // Default: modal style
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/60 backdrop-blur-sm',
        isClosing ? 'animate-fade-out' : 'animate-fade-in',
        className
      )}
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'relative w-full max-w-lg overflow-hidden rounded-3xl',
          'bg-[hsl(var(--portal-card))]',
          'shadow-2xl',
          isClosing ? 'animate-scale-out' : 'animate-scale-in'
        )}
        style={{ backgroundColor }}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 p-2 rounded-full bg-[hsl(var(--portal-muted))] hover:bg-[hsl(var(--portal-muted))]/80 transition-colors"
            aria-label="Close popup"
          >
            <LucideIcon name="X" className="h-5 w-5 text-[hsl(var(--portal-muted-foreground))]" />
          </button>
        )}

        {/* Image */}
        {image?.src && (
          <div className="relative h-48 w-full">
            <Image
              src={image.src}
              alt={image.alt || ''}
              fill
              className="object-cover"
              sizes="512px"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-8 text-center">
          {/* Offer badge */}
          {offer && (
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                  'bg-gradient-to-r from-red-500 to-orange-500 text-white',
                  'text-sm font-bold'
                )}
              >
                <LucideIcon name="Gift" className="h-4 w-4" />
                {offer}
              </span>
            </div>
          )}

          {/* Headline */}
          <h2 className="text-2xl font-bold text-[hsl(var(--portal-foreground))] sm:text-3xl">
            {headline}
          </h2>

          {/* Subheadline */}
          {subheadline && (
            <p className="mt-2 text-lg text-[hsl(var(--portal-primary))] font-medium">
              {subheadline}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="mt-4 text-[hsl(var(--portal-muted-foreground))]">
              {description}
            </p>
          )}

          {/* CTAs */}
          <div className="mt-6 space-y-3">
            <Link
              href={ctaButton.href}
              onClick={handleClose}
              className={cn(
                'block w-full px-6 py-4 rounded-xl font-bold text-lg',
                'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
                'hover:bg-[hsl(var(--portal-primary))]/90 transition-colors',
                'shadow-lg shadow-[hsl(var(--portal-primary))]/25'
              )}
            >
              {ctaButton.text}
            </Link>

            {secondaryButton && (
              <Link
                href={secondaryButton.href}
                onClick={handleClose}
                className={cn(
                  'block w-full px-6 py-3 rounded-xl font-semibold',
                  'bg-[hsl(var(--portal-muted))]',
                  'hover:bg-[hsl(var(--portal-muted))]/80 transition-colors'
                )}
              >
                {secondaryButton.text}
              </Link>
            )}
          </div>

          {/* Dismiss text */}
          <button
            onClick={handleClose}
            className="mt-4 text-sm text-[hsl(var(--portal-muted-foreground))] hover:underline"
          >
            No thanks
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes scale-out {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-fade-out { animation: fade-out 0.3s ease-out; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-scale-out { animation: scale-out 0.3s ease-out; }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
        .animate-slide-out { animation: slide-out 0.3s ease-out; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
