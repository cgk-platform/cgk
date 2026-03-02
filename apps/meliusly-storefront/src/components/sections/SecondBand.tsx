'use client'

import Image from 'next/image'

export function SecondBand() {
  return (
    <div className="relative h-[312px] w-full bg-[#161f2b]">
      {/* Background Image */}
      <div className="absolute top-1/2 left-1/2 h-[456px] w-[1460px] -translate-x-1/2 -translate-y-1/2 opacity-24">
        <Image
          src="/assets/grey-gold-living-room.png"
          alt="Living Room Background"
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="absolute top-[89px] left-[282px] flex content-stretch items-center gap-[83px]">
        {/* Product Image */}
        <div className="relative h-[116px] w-[113px] shrink-0">
          <Image src="/assets/product-display.png" alt="Product" fill className="object-contain" />
        </div>

        {/* Divider Line */}
        <div className="flex h-[81px] w-0 shrink-0 items-center justify-center">
          <div className="h-[81px] w-[1px] rotate-90 bg-white/30" />
        </div>

        {/* Headline */}
        <div className="flex w-[711px] flex-col content-stretch items-center gap-[30px] text-white">
          <h2 className="w-full text-[40px] leading-[1.3] font-semibold whitespace-pre-wrap">
            The Original Sofa Bed Support
          </h2>
          <p className="w-full text-[16px] leading-[1.6] font-medium tracking-[-0.16px] whitespace-pre-wrap">
            Thoughtfully designed and refined through years of real-world use.
          </p>
        </div>
      </div>
    </div>
  )
}
