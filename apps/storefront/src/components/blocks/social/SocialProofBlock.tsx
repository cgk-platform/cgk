'use client'

/**
 * Social Proof Block Component
 *
 * Displays social proof indicators including customer counts,
 * review statistics, press logos, and trust badges.
 */

import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import { Star, Users, Newspaper } from 'lucide-react'
import type { BlockProps, ImageConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Press logo configuration
 */
export interface PressLogo {
  id: string
  name: string
  logo: ImageConfig
  url?: string
}

/**
 * Trust badge configuration
 */
export interface SocialProofBadge {
  id: string
  icon: string
  text: string
}

/**
 * Social Proof block configuration
 */
export interface SocialProofConfig {
  headline?: string
  customerCount?: string
  customerCountLabel?: string
  reviewStats?: {
    rating: number
    reviewCount: string
  }
  reviewStatsLabel?: string
  pressLogos?: PressLogo[]
  pressHeadline?: string
  trustBadges?: SocialProofBadge[]
  layout?: 'horizontal' | 'vertical' | 'compact'
  showDividers?: boolean
  backgroundColor?: string
  textColor?: string
}

/**
 * Render star rating
 */
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-5 w-5',
            i < fullStars
              ? 'fill-amber-400 text-amber-400'
              : i === fullStars && hasHalfStar
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Social Proof Block Component
 */
export function SocialProofBlock({ block, className }: BlockProps<SocialProofConfig>) {
  const {
    headline,
    customerCount,
    customerCountLabel = 'happy customers',
    reviewStats,
    reviewStatsLabel = 'reviews',
    pressLogos = [],
    pressHeadline = 'As seen in',
    trustBadges = [],
    layout = 'horizontal',
    showDividers = true,
    backgroundColor,
    textColor,
  } = block.config

  const textColorStyle = textColor || 'hsl(var(--portal-foreground))'
  const mutedTextColor = textColor
    ? `${textColor}cc`
    : 'hsl(var(--portal-muted-foreground))'

  const hasSocialStats = customerCount || reviewStats
  const hasPressLogos = pressLogos.length > 0
  const hasTrustBadges = trustBadges.length > 0

  return (
    <section
      className={cn('py-12 sm:py-16', className)}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Headline */}
        {headline && (
          <h2
            className="animate-fade-in-up mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: textColorStyle }}
          >
            {headline}
          </h2>
        )}

        {/* Main content */}
        <div
          className={cn(
            layout === 'vertical' && 'space-y-12',
            layout === 'horizontal' && 'flex flex-wrap items-center justify-center gap-8 lg:gap-16',
            layout === 'compact' && 'flex flex-wrap items-center justify-center gap-6'
          )}
        >
          {/* Customer Count */}
          {customerCount && (
            <div
              className={cn(
                'animate-fade-in-up flex items-center gap-3',
                layout === 'vertical' && 'justify-center'
              )}
              style={{ animationDelay: '0ms' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
                <Users className="h-6 w-6 text-[hsl(var(--portal-primary))]" />
              </div>
              <div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: textColorStyle }}
                >
                  {customerCount}
                </div>
                <div
                  className="text-sm"
                  style={{ color: mutedTextColor }}
                >
                  {customerCountLabel}
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          {showDividers && hasSocialStats && customerCount && reviewStats && layout === 'horizontal' && (
            <div className="hidden h-16 w-px bg-[hsl(var(--portal-border))] lg:block" />
          )}

          {/* Review Stats */}
          {reviewStats && (
            <div
              className={cn(
                'animate-fade-in-up flex items-center gap-3',
                layout === 'vertical' && 'justify-center'
              )}
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: textColorStyle }}
                  >
                    {reviewStats.rating}
                  </span>
                  <StarRating rating={reviewStats.rating} />
                </div>
                <div
                  className="text-sm"
                  style={{ color: mutedTextColor }}
                >
                  from {reviewStats.reviewCount} {reviewStatsLabel}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider between sections */}
        {showDividers && hasSocialStats && (hasPressLogos || hasTrustBadges) && (
          <div className="my-10 border-t border-[hsl(var(--portal-border))]" />
        )}

        {/* Press Logos */}
        {hasPressLogos && (
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div
              className="mb-6 flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-wider"
              style={{ color: mutedTextColor }}
            >
              <Newspaper className="h-4 w-4" />
              {pressHeadline}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              {pressLogos.map((press) => (
                <div
                  key={press.id}
                  className="opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                >
                  {press.url ? (
                    <a
                      href={press.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={press.name}
                    >
                      <Image
                        src={press.logo.src}
                        alt={press.logo.alt || press.name}
                        width={press.logo.width || 120}
                        height={press.logo.height || 40}
                        className="h-8 w-auto object-contain"
                      />
                    </a>
                  ) : (
                    <Image
                      src={press.logo.src}
                      alt={press.logo.alt || press.name}
                      width={press.logo.width || 120}
                      height={press.logo.height || 40}
                      className="h-8 w-auto object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {showDividers && hasPressLogos && hasTrustBadges && (
          <div className="my-10 border-t border-[hsl(var(--portal-border))]" />
        )}

        {/* Trust Badges */}
        {hasTrustBadges && (
          <div
            className="animate-fade-in-up flex flex-wrap items-center justify-center gap-6 lg:gap-10"
            style={{ animationDelay: '300ms' }}
          >
            {trustBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                  <LucideIcon
                    name={badge.icon}
                    fallback="Check"
                    className="h-4 w-4 text-green-600"
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: textColorStyle }}
                >
                  {badge.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
