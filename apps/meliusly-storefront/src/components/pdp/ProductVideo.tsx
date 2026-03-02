'use client'

import { useState } from 'react'
import { Play, Calendar, Wrench, Clock } from 'lucide-react'
import Image from 'next/image'

interface ProductVideoProps {
  videoUrl?: string
  thumbnailUrl?: string
  title?: string
}

export function ProductVideo({
  videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  thumbnailUrl = '/meliusly/a50abb42e4b9cb50927483938df0865ace304bfe.webp',
  title = 'Watch Installation',
}: ProductVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayClick = () => {
    setIsPlaying(true)
  }

  return (
    <section className="w-full bg-white px-6 py-10 md:px-12 md:py-16">
      <div className="mx-auto max-w-[1440px]">
        {/* Video Player */}
        <div className="group relative w-full overflow-hidden rounded-2xl">
          {!isPlaying ? (
            <div className="relative w-full">
              {/* Thumbnail Image */}
              <Image
                src={thumbnailUrl}
                alt="Product installation video thumbnail"
                width={1340}
                height={754}
                className="h-auto w-full rounded-2xl object-cover"
                priority
              />

              {/* Play Button Overlay */}
              <button
                onClick={handlePlayClick}
                className="bg-meliusly-primary hover:bg-meliusly-primary/90 absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-lg px-4 py-2.5 text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105"
                aria-label="Play video"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="font-manrope text-base font-medium tracking-[-0.16px] whitespace-nowrap">
                  {title}
                </span>
              </button>
            </div>
          ) : (
            // Embedded Video Player
            <div className="relative aspect-video w-full">
              <iframe
                src={`${videoUrl}?autoplay=1`}
                title={title}
                className="absolute inset-0 h-full w-full rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Benefits Row - Traits */}
        <div className="mt-12 flex flex-col items-center justify-center gap-8 md:mt-16 md:flex-row md:gap-16">
          {/* Benefit 1: One-time Setup */}
          <div className="flex items-center gap-3">
            <Calendar className="text-meliusly-primary h-6 w-6 shrink-0" />
            <p className="font-manrope text-meliusly-dark text-base font-medium tracking-[-0.16px]">
              One-time Setup
            </p>
          </div>

          {/* Benefit 2: No Tools Required */}
          <div className="flex items-center gap-3">
            <Wrench className="text-meliusly-primary h-6 w-6 shrink-0" />
            <p className="font-manrope text-meliusly-dark text-base font-medium tracking-[-0.16px]">
              No Tools Required
            </p>
          </div>

          {/* Benefit 3: Installs in Seconds */}
          <div className="flex items-center gap-3">
            <Clock className="text-meliusly-primary h-6 w-6 shrink-0" />
            <p className="font-manrope text-meliusly-dark text-base font-medium tracking-[-0.16px]">
              Installs in Seconds
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
