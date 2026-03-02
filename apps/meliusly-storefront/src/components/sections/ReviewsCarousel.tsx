'use client'

import { useState, useEffect } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface Review {
  id: number
  name: string
  rating: 5
  title: string
  text: string
  location: string
  verified: boolean
  productName: string
  productImage: string
}

const REVIEWS: Review[] = [
  {
    id: 1,
    name: 'STEVEN V.',
    rating: 5,
    title: 'Just What We Needed',
    text: 'Super easy to set up. Great to have a firmer couch with out the awkward boards we had before. Requires a bit more strength pulling the bed out but worth it! Would recommend!',
    location: 'BOSTON, MA',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/1999d17781910171cf6dde28f216fd3ae2cbf140.png',
  },
  {
    id: 2,
    name: 'VICTOR M.',
    rating: 5,
    title: 'Heavenly Sent',
    text: "I wasn't sure it would work, but this was a heavenly answer. Our camper's queen hideaway had bars and dips everywhere, and this gave full, comfortable support right away. It fit the frame, folded up perfectly, and I slept great all night — I highly recommend it.",
    location: 'UNITED STATES',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/59fe895c4ab7345b86ad05d56a8db7bb2e0f6805.png',
  },
  {
    id: 3,
    name: 'SAM C.',
    rating: 5,
    title: 'It Works!',
    text: 'Really helps make the sofa bed mattress more sturdy. I am very happy with the difference it made. It was a great solution for my husband while recovering and needing easier access.',
    location: 'UNITED STATES',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/69b399f82525ef9b2ecf067bba71854ff7938b38.png',
  },
  {
    id: 4,
    name: 'JENNIFER R.',
    rating: 5,
    title: 'Game Changer',
    text: 'This support board completely transformed our old sofa bed. Guests actually want to sleep over now! The installation was straightforward and the difference in comfort is remarkable.',
    location: 'NEW YORK, NY',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/a28acc41a10b22191c628d308f2881ef6af428fb.png',
  },
  {
    id: 5,
    name: 'MICHAEL T.',
    rating: 5,
    title: 'Worth Every Penny',
    text: 'I was skeptical at first, but this product exceeded all expectations. No more uncomfortable bars or sagging. My back thanks me every morning when guests stay over.',
    location: 'CHICAGO, IL',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/1999d17781910171cf6dde28f216fd3ae2cbf140.png',
  },
  {
    id: 6,
    name: 'LISA K.',
    rating: 5,
    title: 'Highly Recommend',
    text: 'Perfect solution for our guest room sofa bed. Easy to store when not in use, and makes a world of difference in comfort. Wish I had found this years ago!',
    location: 'SAN FRANCISCO, CA',
    verified: true,
    productName: 'SLEEPERSAVER SOFA BED SUPPORT BOARD',
    productImage: '/assets/59fe895c4ab7345b86ad05d56a8db7bb2e0f6805.png',
  },
]

export function ReviewsCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate how many reviews are visible per slide based on screen size
  const reviewsPerSlide = 3 // Desktop: 3, Mobile: 1 (handled via CSS)
  const totalSlides = Math.ceil(REVIEWS.length / reviewsPerSlide)

  const goToSlide = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentSlide(index)
    setTimeout(() => setIsAnimating(false), 600)
  }

  const nextSlide = () => {
    const next = currentSlide === totalSlides - 1 ? 0 : currentSlide + 1
    goToSlide(next)
  }

  const prevSlide = () => {
    const prev = currentSlide === 0 ? totalSlides - 1 : currentSlide - 1
    goToSlide(prev)
  }

  // Auto-advance carousel every 8 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 8000)
    return () => clearInterval(interval)
  }, [currentSlide])

  return (
    <section className="relative overflow-hidden bg-[#F6F6F6] py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mb-12 text-center md:mb-16">
          <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-[#0268A0] uppercase md:mb-4 md:text-sm">
            OVER XX,XXX+ 5-STAR REVIEWS
          </p>
          <h2 className="font-manrope mb-3 text-3xl leading-tight font-semibold text-[#161F2B] md:mb-4 md:text-[40px]">
            But Don't Take Our Word For It
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#777777] md:text-lg">
            Join over 500,000 customers who have restored their comfort.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Reviews Grid */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-600 ease-in-out"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                <div key={slideIndex} className="flex min-w-full gap-4 px-2 md:gap-6">
                  {REVIEWS.slice(
                    slideIndex * reviewsPerSlide,
                    (slideIndex + 1) * reviewsPerSlide
                  ).map((review) => (
                    <div key={review.id} className="min-w-0 flex-1">
                      <ReviewCard review={review} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            disabled={isAnimating}
            className="group absolute top-1/2 left-0 z-10 flex h-12 w-12 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 hover:bg-[#F6F6F6] disabled:cursor-not-allowed disabled:opacity-50 md:h-14 md:w-14 md:-translate-x-12 lg:-translate-x-16"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="h-6 w-6 text-[#161F2B] transition-transform group-hover:scale-110" />
          </button>

          <button
            onClick={nextSlide}
            disabled={isAnimating}
            className="group absolute top-1/2 right-0 z-10 flex h-12 w-12 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 hover:bg-[#F6F6F6] disabled:cursor-not-allowed disabled:opacity-50 md:h-14 md:w-14 md:translate-x-12 lg:translate-x-16"
            aria-label="Next reviews"
          >
            <ChevronRight className="h-6 w-6 text-[#161F2B] transition-transform group-hover:scale-110" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="mt-10 flex items-center justify-center gap-2 md:mt-12">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isAnimating}
              className={`rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? 'h-2 w-8 bg-[#0268A0]'
                  : 'h-2 w-2 bg-[#777777]/30 hover:bg-[#777777]/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Product Image */}
      <div className="relative aspect-[4/3] w-full bg-[#F6F6F6]">
        <Image
          src={review.productImage}
          alt={review.productName}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
          onError={(e) => {
            const target = e.currentTarget
            if (target.src !== '/assets/1999d17781910171cf6dde28f216fd3ae2cbf140.png') {
              target.src = '/assets/1999d17781910171cf6dde28f216fd3ae2cbf140.png'
            }
          }}
        />
      </div>

      {/* Review Content */}
      <div className="flex flex-1 flex-col p-6 md:p-8">
        {/* Star Rating */}
        <div className="mb-4 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-[#FFB81C] text-[#FFB81C]" />
          ))}
        </div>

        {/* Review Title */}
        <h3 className="font-manrope mb-3 text-xl leading-tight font-semibold text-[#161F2B] md:text-2xl">
          {review.title}
        </h3>

        {/* Review Text */}
        <p className="font-manrope mb-6 flex-1 text-base leading-[1.6] text-[#161F2B]">
          {review.text}
        </p>

        {/* Attribution */}
        <div className="flex items-center justify-between border-t border-[#777777]/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="font-manrope text-sm font-semibold text-[#161F2B]">{review.name}</span>
            {review.verified && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-[#0268A0]"
              >
                <path
                  d="M8 0L9.79611 6.20389L16 8L9.79611 9.79611L8 16L6.20389 9.79611L0 8L6.20389 6.20389L8 0Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </div>
          <span className="font-manrope text-sm text-[#777777]">{review.location}</span>
        </div>

        {/* Product Link */}
        <div className="mt-6 border-t border-[#777777]/10 pt-6">
          <a
            href="#"
            className="group flex items-center gap-2 text-sm font-semibold tracking-wide text-[#0268A0] uppercase transition-all duration-300 hover:gap-3"
          >
            <span className="h-6 w-6 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.2" />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-xs leading-tight">{review.productName}</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  )
}
