'use client'

interface DimensionRow {
  size: string
  measurement: string
}

const dimensions: DimensionRow[] = [
  {
    size: 'Twin Size Sofa Bed',
    measurement: '35 × 64 Inches',
  },
  {
    size: 'Full Size Sofa Bed',
    measurement: '46 × 64 Inches',
  },
  {
    size: 'Queen Size Sofa Bed',
    measurement: '54 × 64 Inches',
  },
]

export default function ProductDimensions() {
  return (
    <section
      className="bg-meliusly-lightGray relative py-16 md:py-20"
      aria-labelledby="dimensions-heading"
    >
      <div className="max-w-store mx-auto px-6 md:px-12 lg:px-20">
        {/* Header */}
        <div className="mb-12 space-y-4 md:mb-16">
          <h2
            id="dimensions-heading"
            className="font-manrope leading-heading text-meliusly-dark text-[28px] font-semibold md:text-4xl"
          >
            Fits Standard Sofa Beds
          </h2>
          <p className="font-manrope leading-body tracking-tight-body text-meliusly-dark max-w-2xl text-base font-medium">
            Designed to provide full coverage across standard sofa bed sleeping surfaces.
          </p>
        </div>

        {/* Two Column Layout: Diagram + Dimensions Table */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
          {/* Left Column: 3D Diagram */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-[650px]">
              {/* Main diagram image */}
              <img
                src="/pdp/40cd43d73d1d40e2a44583ef2df6d28b73c7a8f4.png"
                alt="3D isometric view of sofa bed mattress showing Twin (35×64), Full (46×64), and Queen (54×64) size measurements"
                className="h-auto w-full"
                loading="eager"
              />
            </div>
          </div>

          {/* Right Column: Dimensions Table */}
          <div className="flex flex-col justify-center space-y-8 md:space-y-12">
            {/* Section Label */}
            <div>
              <h3 className="font-manrope tracking-label text-xs font-bold text-black uppercase">
                Product Dimensions
              </h3>
            </div>

            {/* Dimensions List */}
            <div className="space-y-8">
              {dimensions.map((item, index) => (
                <div key={item.size}>
                  {/* Dimension Row */}
                  <div className="flex items-center justify-between gap-8">
                    <div className="font-manrope leading-heading text-xl font-semibold text-black capitalize md:text-xl">
                      {item.size}
                    </div>
                    <div className="font-manrope leading-heading text-meliusly-primary text-xl font-semibold md:text-xl">
                      {item.measurement}
                    </div>
                  </div>

                  {/* Divider (except after last item) */}
                  {index < dimensions.length - 1 && (
                    <div className="bg-meliusly-gray-200 mt-8 h-px w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
