'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface ProductType {
  id: string
  title: string
  subtitle: string
  image: string
  badge?: string
  href: string
}

const productTypes: ProductType[] = [
  {
    id: 'sleeper-sofa',
    title: 'Sleeper Sofa Support',
    subtitle: 'Improve sleeper comfort',
    image: '/assets/f06fbab4d4cb303fbaf2b96e7b29874a64652f15.png',
    badge: '/assets/7090d3761b0a8a419de13f1bd472befe0e58ddb1.png',
    href: '/collections/sleeper-sofa-support',
  },
  {
    id: 'sofa-chair',
    title: 'Sofa & Chair Support',
    subtitle: 'Fix sagging sofa & chairs',
    image: '/assets/d4ca5f2e18ca13536b06bea72aafab3c4d8ae7fb.png',
    href: '/collections/sofa-chair-support',
  },
  {
    id: 'bed-support',
    title: 'Bed Support',
    subtitle: 'For a solid, even surface',
    image: '/assets/4e70b1348176729b8091c13cded38902fd83d100.png',
    href: '/collections/bed-support',
  },
]

const testimonials = [
  '"Makes an old sofa like new." — Linda S.',
  '"Saved my favorite leather couch from the landfill." — Sarah J.',
  '"Easy fix for a saggy mattress" — Nick G.',
]

export function ProductTypeSelector() {
  return (
    <section className="w-full bg-[#F3FAFE] px-[50px] py-[100px]">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Heading */}
        <h2 className="font-manrope mb-[50px] text-center text-[32px] leading-[1.3] font-semibold text-[#010101]">
          Find your Support Solution
        </h2>

        {/* Product Type Cards */}
        <div className="mb-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
            {productTypes.map((product) => (
              <ProductTypeCard key={product.id} product={product} />
            ))}
          </div>

          {/* Testimonials Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="flex flex-col gap-[14px] px-6 py-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-[13px] w-[13px] fill-[#FFB81C] text-[#FFB81C]"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <p className="font-manrope text-[12px] leading-[1.8] font-medium tracking-[-0.12px] text-[#161F2B]">
                  {testimonial}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductTypeCard({ product }: { product: ProductType }) {
  return (
    <Link
      href={product.href}
      className="group relative h-[290px] overflow-hidden rounded-lg bg-white transition-all duration-300 hover:shadow-xl"
    >
      {/* Product Image */}
      <div className="absolute inset-0">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      {/* Badge (for first card) */}
      {product.badge && (
        <div className="absolute top-[22px] right-[22px] h-[32px] w-[115px]">
          <Image src={product.badge} alt="Badge" fill className="object-contain" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />

      {/* Content */}
      <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-5 p-[30px]">
        {/* Details */}
        <div className="flex flex-col gap-[22px]">
          <h3 className="font-manrope text-[24px] leading-[1.3] font-semibold text-white capitalize">
            {product.title}
          </h3>
          <p className="font-manrope text-[16px] leading-[1.6] font-medium tracking-[-0.16px] text-[#F6F6F6]">
            {product.subtitle}
          </p>
        </div>

        {/* CTA Button */}
        <button className="font-manrope rounded-lg bg-[#0268A0] px-[17px] py-[15px] text-[16px] leading-[1.2] font-semibold text-white capitalize transition-all hover:bg-[#015580]">
          Shop now
        </button>
      </div>
    </Link>
  )
}
