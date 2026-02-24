/**
 * Hero Banner Section
 *
 * Full-viewport hero with background image, headline, subheading, and CTA.
 * Supports separate desktop/mobile images.
 */

import Image from 'next/image'
import Link from 'next/link'

interface HeroBannerProps {
  headline: string
  subheadline?: string
  ctaText: string
  ctaHref: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  desktopImageUrl?: string
  mobileImageUrl?: string
}

export function HeroBanner({
  headline,
  subheadline,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  desktopImageUrl,
  mobileImageUrl,
}: HeroBannerProps) {
  return (
    <section className="relative flex min-h-[75vh] items-center overflow-hidden bg-cgk-cream md:min-h-[85vh]">
      {/* Background Image */}
      {desktopImageUrl && (
        <Image
          src={desktopImageUrl}
          alt=""
          fill
          className="hidden object-cover md:block"
          priority
          sizes="100vw"
        />
      )}
      {mobileImageUrl && (
        <Image
          src={mobileImageUrl}
          alt=""
          fill
          className="object-cover md:hidden"
          priority
          sizes="100vw"
        />
      )}
      {/* Fallback if only desktop provided */}
      {desktopImageUrl && !mobileImageUrl && (
        <Image
          src={desktopImageUrl}
          alt=""
          fill
          className="object-cover md:hidden"
          priority
          sizes="100vw"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-cgk-navy/40" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-store px-4 py-16 text-center text-white md:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          {headline}
        </h1>
        {subheadline && (
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90 md:text-xl">
            {subheadline}
          </p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={ctaHref}
            className="rounded-btn bg-white px-8 py-3.5 text-base font-semibold text-cgk-navy transition-colors hover:bg-cgk-cream"
          >
            {ctaText}
          </Link>
          {secondaryCtaText && secondaryCtaHref && (
            <Link
              href={secondaryCtaHref}
              className="rounded-btn border-2 border-white px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white hover:text-cgk-navy"
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
