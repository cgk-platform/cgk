/**
 * Marquee Logos Section
 *
 * Infinitely scrolling press/brand logos strip.
 * Pure CSS animation, no JS dependencies.
 */

import Image from 'next/image'

interface Logo {
  src: string
  alt: string
  width?: number
  height?: number
}

interface MarqueeLogosProps {
  logos: Logo[]
  title?: string
  speed?: 'slow' | 'normal' | 'fast'
}

const SPEED_MAP = {
  slow: '40s',
  normal: '30s',
  fast: '20s',
}

export function MarqueeLogos({ logos, title, speed = 'normal' }: MarqueeLogosProps) {
  if (logos.length === 0) return null

  // Double the logos for seamless loop
  const doubled = [...logos, ...logos]

  return (
    <section className="overflow-hidden border-y border-gray-200 bg-white py-6">
      {title && (
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
          {title}
        </p>
      )}
      <div
        className="flex items-center gap-12"
        style={{
          animation: `marquee ${SPEED_MAP[speed]} linear infinite`,
          width: 'max-content',
        }}
      >
        {doubled.map((logo, i) => (
          <div key={i} className="flex-shrink-0 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width ?? 120}
              height={logo.height ?? 40}
              className="h-8 w-auto object-contain md:h-10"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
