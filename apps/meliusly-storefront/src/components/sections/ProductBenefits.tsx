'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@cgk-platform/ui'

interface Benefit {
  id: string
  title: string
  description: string
  image: string
}

const benefits: Benefit[] = [
  {
    id: '1',
    title: 'No More Metal Bars',
    description:
      'Sleep on a smooth, even surface with full coverage that blocks metal bars from end to end.',
    image: '/meliusly/benefits/no-metal-bars.webp',
  },
  {
    id: '2',
    title: 'Firmer, More Supportive Sleep',
    description: 'Our board spreads your weight evenly to eliminate sagging, dips, and soft spots.',
    image: '/meliusly/benefits/supportive-sleep.webp',
  },
  {
    id: '3',
    title: 'Longer Lasting Sofa',
    description: 'Less stress on your sofa frame means lasting sound sleep for years to come.',
    image: '/meliusly/benefits/longer-lasting.webp',
  },
  {
    id: '4',
    title: 'Easy Installation',
    description: 'Simple 15-minute setup with no tools required. Just unfold and place.',
    image: '/meliusly/benefits/easy-install.webp',
  },
  {
    id: '5',
    title: 'Custom Sizing',
    description: 'Perfect fit guaranteed with custom measurements for any sofa bed configuration.',
    image: '/meliusly/benefits/custom-sizing.webp',
  },
  {
    id: '6',
    title: 'Premium Materials',
    description: 'High-density construction built for comfort and designed to last.',
    image: '/meliusly/benefits/premium-materials.webp',
  },
]

export default function ProductBenefits() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slidesPerView, setSlidesPerView] = useState(3)

  // Responsive slides per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSlidesPerView(3)
      } else if (window.innerWidth >= 768) {
        setSlidesPerView(2)
      } else {
        setSlidesPerView(1)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const maxIndex = Math.max(0, benefits.length - slidesPerView)

  const handlePrev = () => {
    if (isAnimating || currentIndex === 0) return
    setIsAnimating(true)
    setCurrentIndex((prev) => Math.max(0, prev - 1))
    setTimeout(() => setIsAnimating(false), 500)
  }

  const handleNext = () => {
    if (isAnimating || currentIndex >= maxIndex) return
    setIsAnimating(true)
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
    setTimeout(() => setIsAnimating(false), 500)
  }

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 500)
  }

  // Touch handling for mobile swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleNext()
    } else if (isRightSwipe) {
      handlePrev()
    }
  }

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Header with Navigation */}
        <div className="mb-12 flex items-end justify-between">
          <h2 className="font-manrope text-meliusly-dark max-w-3xl text-[28px] leading-tight font-semibold md:text-[36px]">
            Make Your Sofa Bed Feel Like a Real Mattress
          </h2>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="border-meliusly-primary text-meliusly-primary hover:bg-meliusly-primary h-12 w-12 rounded-full transition-all hover:text-white disabled:pointer-events-none disabled:opacity-30"
              aria-label="Previous benefit"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="border-meliusly-primary text-meliusly-primary hover:bg-meliusly-primary h-12 w-12 rounded-full transition-all hover:text-white disabled:pointer-events-none disabled:opacity-30"
              aria-label="Next benefit"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / slidesPerView)}%)`,
            }}
          >
            {benefits.map((benefit, index) => (
              <div
                key={benefit.id}
                className="flex-shrink-0 px-3 md:px-4"
                style={{ width: `${100 / slidesPerView}%` }}
              >
                <article
                  className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
                  style={{
                    opacity: isAnimating ? 0.7 : 1,
                    transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={benefit.image}
                      alt={benefit.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                    {/* Subtle gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>

                  {/* Content */}
                  <div className="p-6 md:p-8">
                    <h3 className="font-manrope text-meliusly-dark mb-3 text-[20px] leading-tight font-semibold">
                      {benefit.title}
                    </h3>
                    <p className="font-manrope text-meliusly-grayText text-[16px] leading-[1.6]">
                      {benefit.description}
                    </p>
                  </div>

                  {/* Decorative accent - subtle left border on hover */}
                  <div className="bg-meliusly-primary absolute top-0 left-0 h-full w-1 origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100" />
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-meliusly-primary w-8'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>

        {/* Mobile Navigation (show on small screens) */}
        <div className="mt-6 flex items-center justify-center gap-3 md:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="border-meliusly-primary text-meliusly-primary hover:bg-meliusly-primary h-10 w-10 rounded-full transition-all hover:text-white disabled:pointer-events-none disabled:opacity-30"
            aria-label="Previous benefit"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-manrope text-meliusly-grayText text-sm">
            {currentIndex + 1} / {maxIndex + 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            className="border-meliusly-primary text-meliusly-primary hover:bg-meliusly-primary h-10 w-10 rounded-full transition-all hover:text-white disabled:pointer-events-none disabled:opacity-30"
            aria-label="Next benefit"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
