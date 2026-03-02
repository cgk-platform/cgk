'use client'

import { Truck } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ShippingBanner() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="bg-meliusly-lightBlue flex h-[82px] items-center justify-center overflow-hidden">
      <div className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]">
        {/* Truck icon with slide-in animation */}
        <Truck
          className={`text-meliusly-primary h-6 w-6 transition-all duration-600 ease-out ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'} `}
          strokeWidth={2.5}
        />

        {/* Text with letter-spacing for refinement */}
        <p
          className={`font-manrope text-meliusly-dark text-[18px] font-semibold tracking-wide transition-all delay-100 duration-600 ease-out sm:text-[16px] md:text-[18px] ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'} `}
          style={{ letterSpacing: '0.02em' }}
        >
          Free Shipping On All Orders
        </p>
      </div>
    </div>
  )
}
