'use client'

import { Star, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const reviews = [
  {
    id: '1',
    rating: 5,
    title: 'Just What We Needed',
    text: 'Super easy to set up. Great to have a firmer couch without the awkward boards we had before. Requires a bit more strength to open the sofa bed but worth it! Would recommend!',
    reviewer: 'Steven V.',
    location: 'Boston, MA',
    verified: true,
    image: '/meliusly/reviews/review-1.jpg',
  },
  {
    id: '2',
    rating: 5,
    title: 'Just What We Needed',
    text: "I wasn't sure it would work, but this was a heavenly answer. Our camper's queen hideaway had bars and dips everywhere, and this gave full, comfortable support right away. It fit the frame, folded up perfectly, and I slept great all night — I highly recommend it.",
    reviewer: 'Victor M.',
    location: 'United States',
    verified: true,
    image: '/meliusly/reviews/review-2.jpg',
  },
  {
    id: '3',
    rating: 5,
    title: 'Just What We Needed',
    text: 'Super easy to set up. Great to have a firmer couch without the awkward boards we had before. Requires a bit more strength to open the sofa bed but worth it! Would recommend!',
    reviewer: 'Steven V.',
    location: 'Boston, MA',
    verified: true,
    image: '/meliusly/reviews/review-3.jpg',
  },
]

export default function ProductReviews() {
  const [currentSlide, setCurrentSlide] = useState(0)

  return (
    <section className="bg-white px-12 py-16 lg:px-24 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center gap-8">
          <p className="text-[13px] font-bold tracking-wide text-[#0268A0] uppercase">
            Over XX,XXX+ 5-Star Reviews
          </p>
          <h2 className="text-[40px] leading-[1.3] font-semibold text-[#161F2B]">
            But Don&apos;t Take Our Word For It
          </h2>
          <p className="text-center text-[16px] text-[#161F2B]">
            Join over 500,000 customers who have restored their comfort.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="mb-12 grid grid-cols-1 gap-0 md:grid-cols-3 lg:grid-cols-6">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col border border-[rgba(34,34,34,0.12)]">
              <div className="h-[200px] bg-[#F6F6F6]">
                <div className="flex h-full w-full items-center justify-center text-[#161F2B]/20">
                  <span>Review Image</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-6 p-5">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-[13px] w-[13px] fill-[#FFB81C] text-[#FFB81C]"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <h3 className="text-[24px] leading-[1.3] font-semibold text-black">
                  {review.title}
                </h3>
                <p className="text-[16px] leading-relaxed text-[#161F2B]">{review.text}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-bold text-black uppercase">
                      {review.reviewer}
                    </span>
                    {review.verified && <CheckCircle className="h-3 w-3 text-[#0268A0]" />}
                  </div>
                  <span className="text-[13px] font-bold text-[#777777] uppercase">
                    {review.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3.5">
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] transition-all hover:bg-[#F6F6F6]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i === currentSlide ? 'bg-[#0268A0]' : 'bg-[#E5E7EB]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide(Math.min(2, currentSlide + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] transition-all hover:bg-[#F6F6F6]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
