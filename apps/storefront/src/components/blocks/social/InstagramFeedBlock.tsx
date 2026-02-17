'use client'

/**
 * Instagram Feed Block Component
 *
 * Displays a grid of Instagram-style images with hover overlays
 * showing engagement metrics and links to the Instagram profile.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import { Heart, MessageCircle, Instagram, ExternalLink } from 'lucide-react'
import type { BlockProps, ImageConfig } from '../types'

/**
 * Instagram feed item configuration
 */
export interface InstagramFeedItem {
  id: string
  image: ImageConfig
  likes?: number
  comments?: number
  caption?: string
  permalink?: string
}

/**
 * Instagram Feed block configuration
 */
export interface InstagramFeedConfig {
  headline?: string
  subheadline?: string
  items: InstagramFeedItem[]
  instagramHandle?: string
  instagramUrl?: string
  columns?: 3 | 4 | 5 | 6
  showEngagement?: boolean
  showCaptions?: boolean
  backgroundColor?: string
}

/**
 * Format number for display (e.g., 1234 -> 1.2K)
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Instagram Feed Block Component
 */
export function InstagramFeedBlock({ block, className }: BlockProps<InstagramFeedConfig>) {
  const {
    headline,
    subheadline,
    items = [],
    instagramHandle,
    instagramUrl,
    columns = 4,
    showEngagement = true,
    backgroundColor,
  } = block.config

  const columnClasses = {
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
  }

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline || instagramHandle) && (
          <div className="mb-10 text-center">
            {headline && (
              <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p
                className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--portal-muted-foreground))]"
                style={{ animationDelay: '100ms' }}
              >
                {subheadline}
              </p>
            )}
            {instagramHandle && (
              <Link
                href={instagramUrl || `https://instagram.com/${instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="animate-fade-in-up mt-4 inline-flex items-center gap-2 text-[hsl(var(--portal-primary))] transition-colors hover:opacity-80"
                style={{ animationDelay: '150ms' }}
              >
                <Instagram className="h-5 w-5" />
                <span className="font-medium">{instagramHandle}</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* Image Grid */}
        <div className={cn('grid gap-2 sm:gap-3', columnClasses[columns])}>
          {items.map((item, index) => (
            <div
              key={item.id}
              className="animate-fade-in-up group relative aspect-square overflow-hidden rounded-lg bg-[hsl(var(--portal-muted))]"
              style={{ animationDelay: `${(index % 8) * 50}ms` }}
            >
              {item.image?.src && (
                <Image
                  src={item.image.src}
                  alt={item.image.alt || item.caption || 'Instagram post'}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes={`(max-width: 640px) 50vw, (max-width: 1024px) 33vw, ${100 / columns}vw`}
                />
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {showEngagement && (item.likes !== undefined || item.comments !== undefined) ? (
                  <div className="flex items-center gap-6 text-white">
                    {item.likes !== undefined && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-6 w-6 fill-current" />
                        <span className="font-semibold">{formatNumber(item.likes)}</span>
                      </div>
                    )}
                    {item.comments !== undefined && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 fill-current" />
                        <span className="font-semibold">{formatNumber(item.comments)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Instagram className="h-10 w-10 text-white" />
                )}
              </div>

              {/* Link wrapper */}
              {item.permalink && (
                <Link
                  href={item.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0"
                  aria-label={`View post: ${item.caption || 'Instagram post'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Follow CTA */}
        {instagramHandle && instagramUrl && (
          <div className="mt-10 text-center">
            <Link
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-3 rounded-lg px-6 py-3',
                'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400',
                'font-semibold text-white transition-all duration-300',
                'hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5'
              )}
            >
              <Instagram className="h-5 w-5" />
              Follow {instagramHandle}
            </Link>
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
