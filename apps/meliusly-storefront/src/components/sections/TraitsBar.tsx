'use client'

import { Truck, RefreshCw, Headphones } from 'lucide-react'

export function TraitsBar() {
  const traits = [
    {
      icon: Truck,
      text: 'Free Shipping on all orders',
    },
    {
      icon: RefreshCw,
      text: '30-Day Returns',
    },
    {
      icon: Headphones,
      text: 'US-Based Customer Support',
    },
  ]

  return (
    <section className="w-full border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[104px] items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-12 md:flex-nowrap md:gap-16 lg:gap-20">
            {traits.map((trait, index) => (
              <div
                key={index}
                className="group flex items-center gap-3 transition-all duration-300 ease-out"
              >
                <trait.icon
                  className="h-6 w-6 flex-shrink-0 text-[#0268A0] transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.75}
                />
                <span className="text-[13px] leading-tight font-medium tracking-wide whitespace-nowrap text-[#161F2B]">
                  {trait.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
