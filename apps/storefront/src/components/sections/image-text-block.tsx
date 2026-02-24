/**
 * Image + Text Block Section
 *
 * Split layout with image on one side and text content on the other.
 */

import Image from 'next/image'
import Link from 'next/link'

interface ImageTextBlockProps {
  title: string
  description: string
  imageUrl: string
  imageAlt?: string
  ctaText?: string
  ctaHref?: string
  imagePosition?: 'left' | 'right'
}

export function ImageTextBlock({
  title,
  description,
  imageUrl,
  imageAlt,
  ctaText,
  ctaHref,
  imagePosition = 'left',
}: ImageTextBlockProps) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-store px-4">
        <div className={`flex flex-col items-center gap-8 md:flex-row md:gap-12 ${
          imagePosition === 'right' ? 'md:flex-row-reverse' : ''
        }`}>
          {/* Image */}
          <div className="w-full md:w-1/2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src={imageUrl}
                alt={imageAlt ?? title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="w-full md:w-1/2">
            <h2 className="text-2xl font-bold text-cgk-navy md:text-3xl">
              {title}
            </h2>
            <p className="mt-4 leading-relaxed text-gray-600">
              {description}
            </p>
            {ctaText && ctaHref && (
              <Link
                href={ctaHref}
                className="mt-6 inline-block rounded-btn bg-cgk-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cgk-navy/90"
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
