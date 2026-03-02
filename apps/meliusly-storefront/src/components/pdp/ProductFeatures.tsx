'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'

interface Feature {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const features: Feature[] = [
  {
    id: 'coverage',
    title: 'Full-Length Coverage',
    description: 'Covers the entire canvas and support bar area of the sofa bed.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 22V12H15V22"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'installed',
    title: 'Permanently Installed Design',
    description: 'No tools required for installation, stays securely in place.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14.7 6.29998C15.6 7.19998 16.1 8.39998 16.1 9.69998C16.1 11 15.6 12.2 14.7 13.1L12 15.9L9.3 13.1C8.4 12.2 7.9 11 7.9 9.69998C7.9 8.39998 8.4 7.19998 9.3 6.29998C10.2 5.39998 11.4 4.89998 12.7 4.89998C14 4.89998 15.2 5.39998 16.1 6.29998"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 19L12 15.9"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 13L9.3 13.1"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 13L14.7 13.1"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'durable',
    title: 'Durable Plywood Core',
    description: 'High-density plywood construction supports up to 600 lbs.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 16V12"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 8H12.01"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'grip',
    title: 'Anti-Slip Attachment',
    description: 'Special grip material prevents shifting during use.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 11L12 14L22 4"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'fabric',
    title: 'Fabric Top Layer',
    description: 'Soft, breathable fabric for comfort and easy cleaning.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 9H21"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 21V9"
          stroke="#0268A0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function ProductFeatures() {
  const [expandedId, setExpandedId] = useState<string>('coverage')

  const toggleFeature = (id: string) => {
    setExpandedId(expandedId === id ? '' : id)
  }

  return (
    <section className="w-full bg-white py-12 md:py-20">
      <div className="max-w-store mx-auto px-4 md:px-20">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-15">
          {/* Features List - Left Column on Desktop */}
          <div className="w-full md:flex-1">
            <h2 className="font-manrope leading-heading text-meliusly-dark mb-8 text-2xl font-semibold md:mb-12 md:text-4xl">
              SleepSaver Features
            </h2>

            <div className="flex flex-col">
              {features.map((feature, index) => (
                <div
                  key={feature.id}
                  className={`border-t border-[rgba(34,34,34,0.12)] ${
                    index === features.length - 1 ? '' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleFeature(feature.id)}
                    className="flex w-full items-start gap-4 px-2.5 py-5 text-left transition-all hover:bg-gray-50 md:items-center md:px-4 md:py-6"
                  >
                    {/* Icon */}
                    <div className="bg-meliusly-lightBlue flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full p-[23px]">
                      {feature.icon}
                    </div>

                    {/* Content */}
                    <div className="flex min-w-0 flex-1 flex-col gap-4.5">
                      {/* Title Row */}
                      <div className="flex items-center justify-between gap-5">
                        <h3 className="font-manrope text-meliusly-dark md:text-md md:leading-heading flex-1 text-base leading-[1.4] font-semibold">
                          {feature.title}
                        </h3>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                          {expandedId === feature.id ? (
                            <Minus className="text-meliusly-primary h-5 w-5" strokeWidth={2} />
                          ) : (
                            <Plus className="text-meliusly-primary h-5 w-5" strokeWidth={2} />
                          )}
                        </div>
                      </div>

                      {/* Description - Only visible when expanded */}
                      {expandedId === feature.id && (
                        <p className="font-manrope leading-body tracking-tight-body text-meliusly-dark text-base font-medium">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Product Image - Right Column on Desktop, Top on Mobile */}
          <div className="order-first w-full md:order-last md:w-[542px] md:shrink-0">
            <div className="bg-meliusly-lightBlue relative aspect-[542/562] w-full overflow-hidden rounded-2xl md:rounded-[16px]">
              <Image
                src="/figma-assets/3be6a96ee43da53d1c2f9eb4155835b4d37baa48.webp"
                alt="SleepSaver product layers showing plywood core and fabric layers"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 542px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
