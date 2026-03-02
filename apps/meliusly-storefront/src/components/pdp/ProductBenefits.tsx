'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

const benefits = [
  {
    title: 'No More Metal Bars',
    description:
      'Sleep on a smooth, even surface with full coverage that blocks steel bars from end to end.',
    image: '/meliusly/benefits/benefit-1.jpg',
  },
  {
    title: 'Firmer, More Supportive Sleep',
    description: 'Our board spreads your weight evenly to eliminate sagging, dips, and soft spots.',
    image: '/meliusly/benefits/benefit-2.jpg',
  },
  {
    title: 'Longer Furniture Life',
    description: 'Less stress on your mattress and frame means a longer-lasting sofa bed.',
    image: '/meliusly/benefits/benefit-3.jpg',
  },
  {
    title: 'Always Installed, Always Ready',
    description:
      'Leave it in place and fold it away with your sofa bed—comfort is there whenever you need it.',
    image: '/meliusly/benefits/benefit-4.jpg',
  },
]

export default function ProductBenefits() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateScrollButtons)
      updateScrollButtons()
      return () => scrollContainer.removeEventListener('scroll', updateScrollButtons)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 660
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section className="bg-white px-12 py-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-12 flex items-center justify-between">
          <h2 className="text-[40px] leading-[1.3] font-semibold text-[#161F2B]">
            Make Your Sofa Bed Feel Like a Real Mattress
          </h2>
          <div className="flex gap-3.5">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] transition-all hover:bg-[#F6F6F6] disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] transition-all hover:bg-[#F6F6F6] disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth">
          {benefits.map((benefit, index) => (
            <div key={index} className="w-[640px] flex-shrink-0">
              <div className="mb-8 h-[400px] overflow-hidden rounded-lg bg-[#F6F6F6]">
                <div className="flex h-full w-full items-center justify-center text-[#161F2B]/20">
                  <span>Benefit Image {index + 1}</span>
                </div>
              </div>
              <div className="px-2.5 pb-5">
                <h3 className="mb-8 text-[24px] leading-[1.3] font-semibold text-[#161F2B]">
                  {benefit.title}
                </h3>
                <p className="text-[16px] leading-relaxed text-[#161F2B]">{benefit.description}</p>
              </div>
            </div>
          ))}

          {/* US-Based Card */}
          <div className="w-[326px] flex-shrink-0 overflow-hidden rounded-xl bg-[#F3FAFE] pt-7">
            <div className="mb-8 flex justify-center gap-4.5 px-4">
              <div className="text-4xl">🇺🇸</div>
              <div className="text-4xl">⚙️</div>
              <div className="text-4xl">📜</div>
              <div className="text-4xl">⭐</div>
            </div>
            <div className="px-5 pb-8.5 text-center">
              <h3 className="mb-6 text-[22px] leading-[1.3] font-semibold text-[#161F2B]">
                US-Based & Family-Run
              </h3>
              <p className="text-[16px] leading-relaxed text-[#161F2B]">
                Operated in the US with domestic customer support and a commitment to standing
                behind every product.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
