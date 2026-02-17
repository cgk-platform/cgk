/**
 * Video Embed Block Component
 *
 * Embeds videos from YouTube, Vimeo, or Mux with lazy loading,
 * thumbnail preview, and responsive 16:9 aspect ratio.
 */

'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, VideoEmbedConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Parse video ID from URL for different providers
 */
function parseVideoUrl(url: string): {
  provider: 'youtube' | 'vimeo' | 'mux' | 'custom'
  videoId: string | null
} {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ]

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return { provider: 'youtube', videoId: match[1] }
    }
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch?.[1]) {
    return { provider: 'vimeo', videoId: vimeoMatch[1] }
  }

  // Mux patterns
  const muxMatch = url.match(/(?:stream\.mux\.com\/)([a-zA-Z0-9]+)/)
  if (muxMatch?.[1]) {
    return { provider: 'mux', videoId: muxMatch[1] }
  }

  return { provider: 'custom', videoId: null }
}

/**
 * Get embed URL for a provider
 */
function getEmbedUrl(
  provider: 'youtube' | 'vimeo' | 'mux' | 'custom',
  videoId: string | null,
  originalUrl: string,
  options: { autoplay?: boolean; controls?: boolean; loop?: boolean }
): string {
  const { autoplay = false, controls = true, loop = false } = options

  switch (provider) {
    case 'youtube':
      if (!videoId) return originalUrl
      const youtubeParams = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        controls: controls ? '1' : '0',
        loop: loop ? '1' : '0',
        modestbranding: '1',
        rel: '0',
        ...(loop ? { playlist: videoId } : {}),
      })
      return `https://www.youtube.com/embed/${videoId}?${youtubeParams.toString()}`

    case 'vimeo':
      if (!videoId) return originalUrl
      const vimeoParams = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        controls: controls ? '1' : '0',
        loop: loop ? '1' : '0',
        dnt: '1',
      })
      return `https://player.vimeo.com/video/${videoId}?${vimeoParams.toString()}`

    case 'mux':
      if (!videoId) return originalUrl
      return `https://stream.mux.com/${videoId}.m3u8`

    default:
      return originalUrl
  }
}

/**
 * Get thumbnail URL for a provider
 */
function getThumbnailUrl(
  provider: 'youtube' | 'vimeo' | 'mux' | 'custom',
  videoId: string | null
): string | null {
  switch (provider) {
    case 'youtube':
      if (!videoId) return null
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

    case 'vimeo':
      // Vimeo requires API call, return null and use custom thumbnail
      return null

    case 'mux':
      if (!videoId) return null
      return `https://image.mux.com/${videoId}/thumbnail.jpg?time=0`

    default:
      return null
  }
}

/**
 * Aspect ratio classes
 */
const aspectRatioClasses = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
} as const

/**
 * Play Button Component
 */
function PlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2',
        'flex h-20 w-20 items-center justify-center rounded-full',
        'bg-[hsl(var(--portal-primary))] text-white',
        'shadow-2xl shadow-black/30',
        'transition-all duration-300',
        'hover:scale-110 hover:bg-[hsl(var(--portal-primary))]/90',
        'focus:outline-none focus:ring-4 focus:ring-[hsl(var(--portal-primary))]/50'
      )}
      aria-label="Play video"
    >
      <LucideIcon name="Play" className="ml-1 h-8 w-8" />
    </button>
  )
}

/**
 * Video Embed Block Component
 */
export function VideoEmbedBlock({ block, className }: BlockProps<VideoEmbedConfig>) {
  const {
    headline,
    description,
    videoUrl,
    provider: configProvider,
    thumbnailImage,
    autoplay = false,
    controls = true,
    loop = false,
    aspectRatio = '16:9',
  } = block.config

  const [isPlaying, setIsPlaying] = useState(autoplay)

  // Parse video URL to get provider and ID
  const { provider, videoId } = useMemo(() => {
    const parsed = parseVideoUrl(videoUrl)
    return {
      provider: configProvider || parsed.provider,
      videoId: parsed.videoId,
    }
  }, [videoUrl, configProvider])

  // Get embed URL
  const embedUrl = useMemo(
    () => getEmbedUrl(provider, videoId, videoUrl, { autoplay: isPlaying, controls, loop }),
    [provider, videoId, videoUrl, isPlaying, controls, loop]
  )

  // Get thumbnail URL
  const thumbnailUrl = useMemo(() => {
    if (thumbnailImage?.src) return thumbnailImage.src
    return getThumbnailUrl(provider, videoId)
  }, [thumbnailImage, provider, videoId])

  const handlePlay = () => {
    setIsPlaying(true)
  }

  return (
    <section
      className={cn('py-16 sm:py-24', className)}
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* Header */}
        {(headline || description) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
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

        {/* Video Container */}
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl',
            'bg-[hsl(var(--portal-muted))]',
            'shadow-2xl shadow-black/10',
            aspectRatioClasses[aspectRatio]
          )}
        >
          {!isPlaying && thumbnailUrl ? (
            // Thumbnail with play button
            <>
              <Image
                src={thumbnailUrl}
                alt={thumbnailImage?.alt || headline || 'Video thumbnail'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 900px"
                priority={false}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/20" />
              <PlayButton onClick={handlePlay} />
            </>
          ) : (
            // Iframe or video player
            <>
              {provider === 'mux' ? (
                // Mux uses HLS video
                <video
                  src={embedUrl}
                  autoPlay={isPlaying}
                  controls={controls}
                  loop={loop}
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // YouTube/Vimeo use iframe
                <iframe
                  src={embedUrl}
                  title={headline || 'Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                />
              )}
            </>
          )}
        </div>
      </div>

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
      `}</style>
    </section>
  )
}
