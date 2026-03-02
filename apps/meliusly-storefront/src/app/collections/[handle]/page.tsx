import { notFound } from 'next/navigation'
import { CollectionsComparison } from '@/components/sections/CollectionsComparison'
import { CollectionsFAQ } from '@/components/sections/CollectionsFAQ'
import { Press } from '@/components/sections/Press'
import { ReviewsCarousel } from '@/components/sections/ReviewsCarousel'
import { SecondBand } from '@/components/sections/SecondBand'
import { TraitsBar } from '@/components/sections/TraitsBar'

// Collection metadata
const collections: Record<
  string,
  { name: string; description: string; productCount: number; features: string[] }
> = {
  'sleeper-sofa-support': {
    name: 'Sleeper Sofa Support Boards',
    description: 'Transform your sleeper sofa into a comfortable bed',
    productCount: 3,
    features: [
      'Eliminates the uncomfortable metal bar',
      'Made from durable, high-quality materials',
      'Available in multiple sizes to fit any sleeper sofa',
    ],
  },
  'sofa-chair-support': {
    name: 'Sofa & Chair Support Solutions',
    description: 'Restore comfort and support to worn furniture',
    productCount: 2,
    features: [
      'Prevents sagging and extends furniture life',
      'Easy to install, no tools required',
      'Supports up to 500 lbs',
    ],
  },
  'bed-support': {
    name: 'Bed Support Boards',
    description: 'Premium support for mattresses and box springs',
    productCount: 4,
    features: [
      'Reinforces weak or broken box springs',
      'Provides firm, even support',
      'Fits standard Twin, Full, Queen, King sizes',
    ],
  },
}

export default function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = React.use(params)
  const collection = collections[resolvedParams.handle]

  if (!collection) {
    notFound()
  }

  return (
    <main>
      {/* Hero Band */}
      <div className="relative h-[312px] w-full bg-[#161f2b]">
        <div className="absolute top-1/2 left-1/2 flex w-full max-w-[1200px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[20px] px-[80px] text-center">
          <h1 className="text-[40px] leading-[1.3] font-semibold text-white">{collection.name}</h1>
          <p className="text-[18px] leading-[1.6] font-medium text-white/80">
            {collection.description}
          </p>
        </div>
      </div>

      {/* Features List */}
      <div className="flex w-full flex-col items-center gap-[40px] bg-white px-[80px] py-[60px]">
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-[32px] md:grid-cols-3">
          {collection.features.map((feature, index) => {
            const icons = ['Ban', 'Shield', 'Ruler']
            const Icon = icons[index % 3]

            return (
              <div key={index} className="flex flex-col items-center gap-[16px] text-center">
                <div className="flex size-[48px] items-center justify-center rounded-full bg-[#f3fafe]">
                  {Icon === 'Ban' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#0268a0]"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m4.9 4.9 14.2 14.2" />
                    </svg>
                  )}
                  {Icon === 'Shield' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#0268a0]"
                    >
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                    </svg>
                  )}
                  {Icon === 'Ruler' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#0268a0]"
                    >
                      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                      <path d="m14.5 12.5 2-2" />
                      <path d="m11.5 9.5 2-2" />
                      <path d="m8.5 6.5 2-2" />
                      <path d="m17.5 15.5 2-2" />
                    </svg>
                  )}
                </div>
                <p className="text-[16px] leading-[1.6] font-medium tracking-[-0.16px] text-[#161f2b]">
                  {feature}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Products Grid Header */}
      <div className="flex w-full flex-col items-center gap-[30px] bg-white px-[80px] pb-[60px]">
        <div className="flex w-full max-w-[1200px] items-center justify-between">
          <h2 className="text-[28px] leading-[1.3] font-semibold text-[#161f2b]">
            {collection.productCount} products
          </h2>
          <button className="rounded-[8px] border border-solid border-[#0268a0] bg-white px-[20px] py-[12px] text-[16px] font-semibold text-[#0268a0] capitalize transition-colors hover:bg-[#0268a0] hover:text-white">
            Compare Products
          </button>
        </div>
      </div>

      {/* Press Section */}
      <Press />

      {/* Comparison Table */}
      <CollectionsComparison />

      {/* Second Band */}
      <SecondBand />

      {/* FAQ Section */}
      <CollectionsFAQ />

      {/* Reviews */}
      <ReviewsCarousel />

      {/* Traits Bar */}
      <TraitsBar />
    </main>
  )
}

// Fix React import for React.use()
import React from 'react'
