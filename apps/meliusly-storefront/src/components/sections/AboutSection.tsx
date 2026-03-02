'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px',
      }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Image Column */}
          <div
            className={`relative transition-all duration-700 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : '-translate-x-5 opacity-0'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <div className="bg-meliusly-lightGray relative aspect-[4/5] w-full overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] lg:aspect-[3/4]">
              {/* Placeholder for founders image */}
              <div className="text-meliusly-grayText flex h-full w-full items-center justify-center">
                <p className="text-sm">Founders Image</p>
              </div>
            </div>
          </div>

          {/* Content Column */}
          <div className="flex flex-col justify-center space-y-6 lg:space-y-8">
            <h2
              className={`font-manrope text-[28px] leading-[1.3] font-semibold tracking-[-0.02em] text-[#161F2B] transition-all duration-700 ease-out lg:text-[32px] ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              Our Story
            </h2>

            <div className="space-y-5">
              <p
                className={`font-manrope text-[16px] leading-[1.6] font-medium tracking-[0.01em] text-[#777777] transition-all duration-700 ease-out ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'
                }`}
                style={{ transitionDelay: '500ms' }}
              >
                We started Meliusly after running into furniture support problems in our own home
                that existing products didn't solve well.
              </p>

              <p
                className={`font-manrope text-[16px] leading-[1.6] font-medium tracking-[0.01em] text-[#777777] transition-all duration-700 ease-out ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0'
                }`}
                style={{ transitionDelay: '700ms' }}
              >
                As engineers, we began creating practical support solutions focused on real
                structural issues, which grew into a business dedicated to furniture support done
                right.
              </p>
            </div>

            <div
              className={`transition-all duration-700 ease-out ${
                isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              style={{ transitionDelay: '900ms' }}
            >
              <Link
                href="/about"
                className="font-manrope inline-flex items-center justify-center rounded-lg bg-[#0268A0] px-8 py-3.5 text-[16px] font-semibold text-white transition-all duration-300 hover:bg-[#015A8C] hover:shadow-lg hover:shadow-[#0268A0]/20 active:scale-[0.98]"
              >
                Read Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
