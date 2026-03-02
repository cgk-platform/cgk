'use client'

export function Press() {
  return (
    <div className="flex w-full flex-col content-stretch items-center justify-center bg-[#f3fafe] px-[50px] py-[80px]">
      <div className="flex w-full flex-col content-stretch items-center justify-center gap-[40px] text-center font-semibold whitespace-nowrap">
        <h3 className="text-[22px] leading-[1.3] text-[#161f2b] capitalize">
          Recommended by New York Times Wirecutter
        </h3>
        <blockquote className="text-[40px] leading-[1.3] text-[#0268a0]">
          "Everyday home comfort redefined"
        </blockquote>
      </div>
    </div>
  )
}
