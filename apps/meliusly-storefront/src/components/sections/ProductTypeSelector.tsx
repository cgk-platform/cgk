'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface ProductCategory {
  id: string
  label: string
  href: string
  description?: string
}

const categories: ProductCategory[] = [
  {
    id: 'all',
    label: 'All Products',
    href: '/collections/all',
    description: 'Browse our complete range of furniture support solutions',
  },
  {
    id: 'sofa-bed',
    label: 'Sofa Bed Supports',
    href: '/collections/sofa-bed-supports',
    description: 'Transform your sleeper sofa into a comfortable bed',
  },
  {
    id: 'mattress',
    label: 'Mattress Supports',
    href: '/collections/mattress-supports',
    description: 'Reinforce and extend the life of your mattress',
  },
  {
    id: 'custom',
    label: 'Custom Solutions',
    href: '/collections/custom-solutions',
    description: 'Tailored support systems for unique furniture needs',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    href: '/collections/accessories',
    description: 'Enhance and maintain your furniture supports',
  },
]

export function ProductTypeSelector() {
  const [activeTab, setActiveTab] = useState('all')
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    const activeElement = tabRefs.current[activeTab]
    if (activeElement) {
      setUnderlineStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth,
      })
    }
  }, [activeTab])

  const activeCategory = categories.find((cat) => cat.id === activeTab)

  return (
    <section className="relative w-full bg-gradient-to-b from-white via-gray-50/30 to-white py-20 md:py-28">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative container mx-auto px-4 md:px-6">
        {/* Section Heading */}
        <div className="animate-fade-in-up mb-12 text-center md:mb-16">
          <h2 className="font-manrope text-meliusly-dark mb-3 text-3xl leading-tight font-semibold tracking-tight md:text-[40px]">
            Find your Support Solution
          </h2>
          <p className="font-manrope mx-auto max-w-2xl text-base text-gray-600 md:text-lg">
            Explore our range of premium furniture support systems designed for lasting comfort
          </p>
        </div>

        {/* Tab Selector */}
        <div className="mb-16">
          <div className="relative mx-auto max-w-5xl">
            {/* Tab Container */}
            <div className="relative flex flex-wrap justify-center gap-2 pb-1 md:gap-1">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  ref={(el: HTMLButtonElement | null) => {
                    tabRefs.current[category.id] = el
                  }}
                  onClick={() => setActiveTab(category.id)}
                  className={`font-manrope relative px-5 py-3.5 text-sm font-semibold transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] md:px-7 md:py-4 md:text-base ${
                    activeTab === category.id
                      ? 'text-meliusly-primary'
                      : 'text-meliusly-dark hover:text-meliusly-primary/80'
                  }`}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                  }}
                >
                  {category.label}

                  {/* Hover background effect */}
                  <div className="bg-meliusly-primary/5 absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-200 hover:opacity-100" />
                </button>
              ))}

              {/* Animated underline */}
              <div
                className="from-meliusly-primary via-meliusly-primary to-meliusly-primary/70 absolute bottom-0 h-[3px] rounded-full bg-gradient-to-r transition-all duration-500 ease-out"
                style={{
                  left: `${underlineStyle.left}px`,
                  width: `${underlineStyle.width}px`,
                }}
              />
            </div>
          </div>

          {/* Active Category Description */}
          <div className="mt-8 text-center">
            <p
              key={activeTab}
              className="font-manrope animate-fade-in mx-auto max-w-xl text-base text-gray-600"
            >
              {activeCategory?.description}
            </p>
          </div>
        </div>

        {/* Product Grid Placeholder - This would connect to actual product data */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {[1, 2, 3].map((item, index) => (
            <div
              key={`${activeTab}-${item}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
              style={{
                animation: `fadeInScale 0.5s ease-out ${index * 0.1}s both`,
              }}
            >
              {/* Product card content would go here */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100" />

              {/* Overlay on hover */}
              <div className="from-meliusly-dark/80 via-meliusly-dark/20 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Action button */}
              <div className="absolute right-0 bottom-0 left-0 translate-y-4 p-6 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <Link
                  href={activeCategory?.href || '/collections/all'}
                  className="bg-meliusly-primary font-manrope hover:bg-meliusly-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="animate-fade-in mt-12 text-center" style={{ animationDelay: '0.4s' }}>
          <Link
            href={activeCategory?.href || '/collections/all'}
            className="font-manrope text-meliusly-primary hover:text-meliusly-primary/80 group inline-flex items-center gap-2 text-base font-semibold transition-colors"
          >
            View All {activeCategory?.label}
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out both;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out both;
        }
      `}</style>
    </section>
  )
}
