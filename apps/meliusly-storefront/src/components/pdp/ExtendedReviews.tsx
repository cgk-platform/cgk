'use client'

import { Star, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface ReviewPhoto {
  id: string
  url: string
  alt: string
}

interface Review {
  id: string
  author: {
    name: string
    initials: string
    location: string
    verified: boolean
  }
  rating: number
  title: string
  content: string
  photos: ReviewPhoto[]
  date: string
  timeAgo: string
}

// Mock data matching Figma
const mockReviews: Review[] = [
  {
    id: '1',
    author: {
      name: 'STEVEN V.',
      initials: 'SV',
      location: 'UNITED STATES',
      verified: true,
    },
    rating: 5,
    title: 'Just What We Needed!',
    content:
      'Super easy to set up. Great to have a firmer couch with out the awkward boards we had before. Requires a bit more strength to open the sofa bed but worth it! Would recommend!',
    photos: [
      { id: 'p1', url: '/placeholder-review-1.jpg', alt: 'Customer photo 1' },
      { id: 'p2', url: '/placeholder-review-2.jpg', alt: 'Customer photo 2' },
    ],
    date: '2024-10-02',
    timeAgo: '5 months ago',
  },
  {
    id: '2',
    author: {
      name: 'VICTOR M.',
      initials: 'VM',
      location: 'UNITED STATES',
      verified: true,
    },
    rating: 5,
    title: 'Heavenly Sent',
    content:
      "I wasn't sure it would work, but this was a heavenly answer. Our camper's queen hideaway had bars and dips everywhere, and this gave full, comfortable support right away. If it the frame, folded up perfectly, and I slept great all night — I highly recommend it.",
    photos: [
      { id: 'p3', url: '/placeholder-review-3.jpg', alt: 'Customer photo 3' },
      { id: 'p4', url: '/placeholder-review-4.jpg', alt: 'Customer photo 4' },
      { id: 'p5', url: '/placeholder-review-5.jpg', alt: 'Customer photo 5' },
    ],
    date: '2024-10-02',
    timeAgo: '5 months ago',
  },
  {
    id: '3',
    author: {
      name: 'SAM C.',
      initials: 'SM',
      location: 'UNITED STATES',
      verified: true,
    },
    rating: 5,
    title: 'It Works!',
    content:
      'Really helps make the sofa bed mattress more sturdy. I am very happy with the difference it made. It was a great solution for my husband while recovering and needing easier access.',
    photos: [
      { id: 'p6', url: '/placeholder-review-6.jpg', alt: 'Customer photo 6' },
      { id: 'p7', url: '/placeholder-review-7.jpg', alt: 'Customer photo 7' },
    ],
    date: '2024-10-02',
    timeAgo: '5 months ago',
  },
  {
    id: '4',
    author: {
      name: 'STEVEN V.',
      initials: 'SV',
      location: 'UNITED STATES',
      verified: true,
    },
    rating: 5,
    title: 'Just What We Needed!',
    content:
      'Super easy to set up. Great to have a firmer couch with out the awkward boards we had before. Requires a bit more strength to open the sofa bed but worth it! Would recommend!',
    photos: [
      { id: 'p8', url: '/placeholder-review-8.jpg', alt: 'Customer photo 8' },
      { id: 'p9', url: '/placeholder-review-9.jpg', alt: 'Customer photo 9' },
      { id: 'p10', url: '/placeholder-review-10.jpg', alt: 'Customer photo 10' },
      { id: 'p11', url: '/placeholder-review-11.jpg', alt: 'Customer photo 11' },
    ],
    date: '2024-10-02',
    timeAgo: '5 months ago',
  },
  {
    id: '5',
    author: {
      name: 'VICTOR M.',
      initials: 'VM',
      location: 'UNITED STATES',
      verified: true,
    },
    rating: 5,
    title: 'Heavenly Sent',
    content:
      "I wasn't sure it would work, but this was a heavenly answer. Our camper's queen hideaway had bars and dips everywhere, and this gave full, comfortable support right away. If it the frame, folded up perfectly, and I slept great all night — I highly recommend it.",
    photos: [{ id: 'p12', url: '/placeholder-review-12.jpg', alt: 'Customer photo 12' }],
    date: '2024-10-02',
    timeAgo: '5 months ago',
  },
]

// All customer photos for the top gallery strip
const allPhotos = mockReviews.flatMap((review) => review.photos).slice(0, 7)

export default function ExtendedReviews() {
  const [currentPage, setCurrentPage] = useState(1)
  const reviewsPerPage = 5
  const totalPages = Math.ceil(mockReviews.length / reviewsPerPage)

  const startIndex = (currentPage - 1) * reviewsPerPage
  const displayedReviews = mockReviews.slice(startIndex, startIndex + reviewsPerPage)

  const averageRating = 4.9
  const totalReviews = 33

  return (
    <section className="w-full bg-white py-12 md:py-20">
      <div className="max-w-store mx-auto px-4 md:px-20">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="font-manrope leading-heading text-meliusly-dark text-2xl font-semibold md:text-4xl">
              Customer Reviews
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-manrope text-meliusly-dark text-base font-semibold">
                  {averageRating}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 fill-[#0268A0] text-[#0268A0]"
                      strokeWidth={0}
                    />
                  ))}
                </div>
              </div>
              <span className="font-manrope text-meliusly-darkGray text-sm font-normal">
                Based on {totalReviews} reviews
              </span>
            </div>
          </div>

          <button className="font-manrope rounded-lg bg-[#0268A0] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#015A8A]">
            Write a Review
          </button>
        </div>

        {/* Photo Gallery Strip */}
        <div className="mb-10 flex gap-2 overflow-x-auto pb-2 md:mb-12 md:gap-3">
          {allPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-gray-100"
            >
              <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
            </div>
          ))}
        </div>

        {/* Reviews List */}
        <div className="flex flex-col gap-8 md:gap-10">
          {displayedReviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col gap-4 border-b border-gray-200 pb-8 md:pb-10"
            >
              {/* Review Header */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <span className="font-manrope text-meliusly-dark text-sm font-semibold">
                    {review.author.initials}
                  </span>
                </div>

                {/* Author Info & Rating */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-manrope text-meliusly-dark text-xs font-semibold tracking-wide uppercase">
                          {review.author.name}
                        </span>
                        {review.author.verified && (
                          <CheckCircle2 className="h-3.5 w-3.5 fill-[#0268A0] text-white" />
                        )}
                      </div>
                      <span className="font-manrope text-2xs text-meliusly-darkGray font-normal tracking-wide uppercase">
                        {review.author.location}
                      </span>
                    </div>
                    <span className="font-manrope text-2xs text-meliusly-darkGray font-normal md:text-right">
                      {review.timeAgo}
                    </span>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'fill-[#0268A0] text-[#0268A0]'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="flex flex-col gap-3">
                <h3 className="font-manrope text-meliusly-dark text-base leading-[1.4] font-semibold">
                  {review.title}
                </h3>
                <p className="font-manrope leading-body text-meliusly-dark text-sm font-normal">
                  {review.content}
                </p>
              </div>

              {/* Review Photos */}
              {review.photos.length > 0 && (
                <div className="flex gap-2">
                  {review.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                    >
                      <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="text-meliusly-darkGray flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`font-manrope flex h-8 min-w-[32px] items-center justify-center rounded px-2 text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-[#0268A0] text-white'
                  : 'text-meliusly-darkGray hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="text-meliusly-darkGray flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
