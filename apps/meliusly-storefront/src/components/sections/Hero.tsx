'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative h-[700px] w-full overflow-hidden">
      {/* Background Images - Desktop/Mobile responsive */}
      <div className="absolute inset-0">
        {/* Desktop Image */}
        <Image
          src="/meliusly/hero/hero-desktop.webp"
          alt="Premium sofa bed support solutions"
          fill
          priority
          quality={90}
          className="hidden object-cover object-center md:block"
          sizes="100vw"
        />
        {/* Mobile Image */}
        <Image
          src="/meliusly/hero/hero-mobile.webp"
          alt="Premium sofa bed support solutions"
          fill
          priority
          quality={90}
          className="block object-cover object-center md:hidden"
          sizes="100vw"
        />
        {/* Subtle overlay for text legibility */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content Container */}
      <div className="relative mx-auto h-full max-w-[1440px] px-6 lg:px-12">
        <div className="flex h-full items-center">
          {/* Left-aligned content block */}
          <div
            className={`max-w-[640px] transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            {/* Amazon Review Badge */}
            <div className="mb-6 flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#FFB81C] text-[#FFB81C]" strokeWidth={0} />
                ))}
              </div>
              <span className="font-manrope text-sm font-medium text-white">
                Over XX,XXX+ reviews on Amazon
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-manrope mb-[30px] text-[40px] leading-[1.3] font-semibold text-white">
              Fix Sagging Furniture with Durable Support Solutions
            </h1>

            {/* Subheadline */}
            <p className="font-manrope mb-[40px] max-w-[560px] text-[16px] leading-[1.6] font-medium tracking-[-0.16px] text-white">
              Restore comfort and stability to sofas, sleeper sofas, and bed without replacing them.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col gap-[15px]">
              <Link
                href="/collections/all"
                className="font-manrope inline-flex h-[56px] w-[328px] items-center justify-center rounded-lg bg-[#0268A0] px-6 py-[21px] text-[16px] leading-[1.2] font-semibold text-white capitalize shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#015580] hover:shadow-xl"
              >
                Shop All Support Solutions
              </Link>
              <p className="font-manrope text-center text-[14px] leading-[1.6] font-medium tracking-[-0.14px] text-white">
                Free shipping on all orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient fade at bottom */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t from-black/10 to-transparent" />
    </section>
  )
}
