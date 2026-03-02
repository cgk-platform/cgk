import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  price: string
  image: string
  isCurrentProduct: boolean
  isBestSeller: boolean
  features: {
    recommendedFor: string
    comfortFeel: string
    blocksMetalBar: boolean
    improvesWeight: boolean
    coverage: string
    installationType: string
    materials: string
  }
}

const products: Product[] = [
  {
    id: '1',
    name: 'SleeperSaver Sofa Bed Support Board',
    slug: 'sleepsaver-pro',
    price: '$109.99',
    image: '/meliusly/products/sleepsaver.png',
    isCurrentProduct: true,
    isBestSeller: true,
    features: {
      recommendedFor: 'Frequent sofa bed use & best overall comfort',
      comfortFeel: 'Balanced, bed-like support',
      blocksMetalBar: true,
      improvesWeight: true,
      coverage: 'Full sleeping surface',
      installationType: 'Permanent, stays in place',
      materials: 'High-density support core with durable fabric cover',
    },
  },
  {
    id: '2',
    name: 'Classic Sleeper Sofa Support Board',
    slug: 'classic-sleeper',
    price: '$69.99',
    image: '/meliusly/products/classic.png',
    isCurrentProduct: false,
    isBestSeller: false,
    features: {
      recommendedFor: 'Maximum firmness',
      comfortFeel: 'Very firm, solid support',
      blocksMetalBar: true,
      improvesWeight: true,
      coverage: 'Targeted support over sleeper bars',
      installationType: 'Removable, fold-and-store',
      materials: 'Reinforced hardwood plywood wrapped in Oxford polyester',
    },
  },
  {
    id: '3',
    name: 'Flex Sleeper Sofa Support Board',
    slug: 'flex-sleeper',
    price: '$69.99',
    image: '/meliusly/products/flex.png',
    isCurrentProduct: false,
    isBestSeller: false,
    features: {
      recommendedFor: 'Comfort with flexibility & pressure relief',
      comfortFeel: 'Supportive with slight give',
      blocksMetalBar: true,
      improvesWeight: true,
      coverage: 'Targeted support over sleeper bars',
      installationType: 'Removable, fold-and-store',
      materials: 'Twin-wall polypropylene with breathable fabric cover',
    },
  },
]

export default function ComparisonTable({ currentProductId }: { currentProductId: string }) {
  return (
    <section className="bg-white px-6 py-16 lg:px-20 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Title */}
        <h2 className="mb-12 text-center text-[28px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[40px]">
          Compare Our Sofa Bed Support Boards
        </h2>

        {/* Comparison Table - Horizontal Scroll on Mobile */}
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full flex-col lg:flex-row">
            {/* Left Column: Feature Labels */}
            <div className="hidden w-full flex-col lg:flex lg:w-auto lg:shrink-0">
              <div className="h-[284px]" />
              <FeatureRow label="Recommended For" />
              <FeatureRow label="Comfort Feel" isGray />
              <FeatureRow label="Blocks Metal Bar Discomfort" />
              <FeatureRow label="Improves Weight Distribution" isGray />
              <FeatureRow label="Coverage" />
              <FeatureRow label="Installation Type" isGray />
              <FeatureRow label="Materials" />
            </div>

            {/* Product Columns */}
            <div className="flex min-w-full gap-0 lg:min-w-0 lg:flex-1">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex min-w-[280px] flex-1 flex-col sm:min-w-[320px]"
                >
                  {/* Product Header */}
                  <div className="relative flex flex-col items-center gap-5 pt-0 pb-8">
                    {/* Best Seller Badge */}
                    {product.isBestSeller && (
                      <div className="absolute top-2 left-12 z-10 flex h-[60px] w-[60px] -rotate-[7deg] items-center justify-center rounded-full border-[2.5px] border-[#0268A0] bg-[#F3FAFE]">
                        <p className="text-center text-[12px] leading-tight font-extrabold tracking-wide text-[#0268A0] uppercase">
                          Best
                          <br />
                          Seller
                        </p>
                      </div>
                    )}

                    {/* Product Image Placeholder */}
                    <div className="relative h-[103px] w-[140px]">
                      <div className="flex h-full w-full items-center justify-center rounded bg-[#F6F6F6]">
                        <span className="text-sm text-[#161F2B]/30">Product Image</span>
                      </div>
                    </div>

                    {/* Product Name */}
                    <p className="px-10 text-center text-[18px] leading-[1.3] font-semibold text-[#161F2B]">
                      {product.name}
                    </p>

                    {/* Price */}
                    <div className="flex items-end gap-1.5">
                      <span className="text-[14px] leading-relaxed font-medium text-[#777777]">
                        from
                      </span>
                      <span className="text-[18px] leading-[1.3] font-semibold text-[#0268A0]">
                        {product.price}
                      </span>
                    </div>

                    {/* CTA Button */}
                    {product.isCurrentProduct ? (
                      <button
                        disabled
                        className="rounded-lg bg-[#0268A0] px-6 py-3.5 text-[16px] leading-tight font-semibold text-white opacity-35"
                      >
                        Currently Viewing
                      </button>
                    ) : (
                      <Link
                        href={`/products/${product.slug}`}
                        className="rounded-lg bg-[#0268A0] px-6 py-3.5 text-[16px] leading-tight font-semibold text-white transition-all duration-300 hover:bg-[#015580]"
                      >
                        Shop Now
                      </Link>
                    )}
                  </div>

                  {/* Feature Rows */}
                  <div className="flex flex-col">
                    <ProductFeatureCell value={product.features.recommendedFor} border />
                    <ProductFeatureCell value={product.features.comfortFeel} isGray />
                    <ProductFeatureCell value={product.features.blocksMetalBar} isCheckmark />
                    <ProductFeatureCell
                      value={product.features.improvesWeight}
                      isCheckmark
                      isGray
                    />
                    <ProductFeatureCell value={product.features.coverage} />
                    <ProductFeatureCell value={product.features.installationType} isGray />
                    <ProductFeatureCell value={product.features.materials} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureRow({ label, isGray = false }: { label: string; isGray?: boolean }) {
  return (
    <div className={`flex h-[70px] items-center px-8 ${isGray ? 'bg-[#F5F5F5]' : ''}`}>
      <p className="text-[16px] leading-tight font-semibold text-[#161F2B]">{label}</p>
    </div>
  )
}

function ProductFeatureCell({
  value,
  isCheckmark = false,
  isGray = false,
  border = false,
}: {
  value: string | boolean
  isCheckmark?: boolean
  isGray?: boolean
  border?: boolean
}) {
  return (
    <div
      className={`flex h-[70px] items-center justify-center px-8 ${isGray ? 'bg-[#F5F5F5]' : ''} ${border ? 'border-t border-[rgba(34,34,34,0.12)]' : ''}`}
    >
      {isCheckmark && value === true ? (
        <Check className="h-8 w-8 text-[#0268A0]" strokeWidth={2.5} />
      ) : (
        <p className="text-center text-[16px] leading-relaxed font-medium text-[#161F2B]">
          {String(value)}
        </p>
      )}
    </div>
  )
}
