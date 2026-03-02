'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Guide {
  id: string
  title: string
  slug: string
  image: string
  imageAlt: string
}

const guides: Guide[] = [
  {
    id: '1',
    title: 'Sleeper Sofa Product Guides',
    slug: 'sleeper-sofa-guides',
    image: '/meliusly/guides/sleeper-sofa.png',
    imageAlt: 'Sleeper sofa support system with golden cushion',
  },
  {
    id: '2',
    title: 'Sofa & Chair Support Guides',
    slug: 'sofa-chair-guides',
    image: '/meliusly/guides/sofa-chair.png',
    imageAlt: 'Sofa and chair support system with orange cushion',
  },
  {
    id: '3',
    title: 'Bed Support Guides',
    slug: 'bed-support-guides',
    image: '/meliusly/guides/bed-support.png',
    imageAlt: 'Bed support system with burgundy cushion',
  },
]

export function ProductGuides() {
  return (
    <section className="w-full bg-white py-16 md:py-20">
      <div className="max-w-store mx-auto px-6">
        {/* Section Header */}
        <div className="mb-12 text-left">
          <h2 className="font-manrope text-meliusly-dark text-3xl font-semibold md:text-4xl">
            Product Guides
          </h2>
          <p className="font-manrope text-meliusly-grayText mt-3 text-base font-medium">
            Get help with installation, sizing, and using your Meliusly products.
          </p>
        </div>

        {/* Guide Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {guides.map((guide, index) => (
            <Link
              key={guide.id}
              href={`/guides/${guide.slug}`}
              className="group bg-meliusly-lightGray relative overflow-hidden rounded-lg transition-all duration-300 hover:shadow-lg"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
                opacity: 0,
              }}
            >
              {/* Product Image */}
              <div className="bg-meliusly-lightGray relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={guide.image}
                  alt={guide.imageAlt}
                  fill
                  className="object-contain p-8 transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              {/* Card Content */}
              <div className="p-6">
                <h3 className="font-manrope text-meliusly-dark mb-4 text-lg font-semibold">
                  {guide.title}
                </h3>

                {/* CTA */}
                <div className="font-manrope tracking-label text-meliusly-primary group-hover:text-meliusly-secondary flex items-center text-xs font-semibold uppercase transition-colors">
                  <span>Learn More</span>
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    strokeWidth={2.5}
                  />
                </div>
              </div>

              {/* Hover Effect Overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 shadow-xl transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}
