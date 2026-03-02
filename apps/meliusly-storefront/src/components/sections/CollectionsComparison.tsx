'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'

const products = [
  {
    name: 'SleeperSaver Sofa Bed Support Board',
    image: '/assets/sleepersaver-thumb.webp',
    price: '$109.99',
    badge: 'best seller',
    features: {
      recommended: 'Frequent sofa bed use & best overall comfort',
      comfort: 'Balanced, bed-like support',
      blocksBar: true,
      distribution: true,
      coverage: 'Full sleeping surface',
      installation: 'Permanent, stays in place',
      materials: 'High-density support core with durable fabric cover',
    },
  },
  {
    name: 'Classic Sleeper Sofa Support Board',
    image: '/assets/classic-sleeper-thumb.webp',
    price: '$69.99',
    features: {
      recommended: 'Maximum firmness',
      comfort: 'Very firm, solid support',
      blocksBar: true,
      distribution: true,
      coverage: 'Targeted support over sleeper bars',
      installation: 'Removable, fold-and-store',
      materials: 'Reinforced hardwood plywood wrapped in Oxford polyester',
    },
  },
  {
    name: 'Flex Sleeper Sofa Support Board',
    image: '/assets/flex-sleeper-thumb.webp',
    price: '$69.99',
    features: {
      recommended: 'Comfort with flexibility & pressure relief',
      comfort: 'Supportive with slight give',
      blocksBar: true,
      distribution: true,
      coverage: 'Targeted support over sleeper bars',
      installation: 'Removable, fold-and-store',
      materials: 'Twin-wall polypropylene with breathable fabric cover',
    },
  },
]

const featureLabels = [
  { key: 'recommended', label: 'Recommended for' },
  { key: 'comfort', label: 'Comfort feel' },
  { key: 'blocksBar', label: 'Blocks metal bar discomfort' },
  { key: 'distribution', label: 'Improves weight distribution' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'installation', label: 'Installation type' },
  { key: 'materials', label: 'Materials' },
]

export function CollectionsComparison() {
  return (
    <div className="flex w-full flex-col content-stretch items-center gap-[50px] bg-white px-[80px] pt-[100px] pb-[80px]">
      <h2 className="w-full text-center text-[40px] leading-[1.3] font-semibold whitespace-pre-wrap text-[#161f2b]">
        Compare Our Sofa Bed Support Boards
      </h2>

      <div className="flex w-full content-stretch items-start overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-1/4 align-top" />
              {products.map((product, index) => (
                <th key={index} className="w-1/4 align-top">
                  <div className="flex flex-col content-stretch items-center gap-[20px] rounded-t-[10px] pb-[30px]">
                    <div className="relative h-[103px] w-[140px]">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col content-stretch items-center px-[40px]">
                      <p className="w-full text-center text-[18px] leading-[1.3] font-semibold whitespace-pre-wrap text-[#161f2b] capitalize">
                        {product.name}
                      </p>
                    </div>
                    <div className="flex content-stretch items-end gap-[6px] text-center">
                      <p className="text-[14px] leading-[1.6] font-medium tracking-[-0.14px] text-[#777]">
                        from
                      </p>
                      <p className="text-[18px] leading-[1.3] font-semibold text-[#0268a0] capitalize">
                        {product.price}
                      </p>
                    </div>
                    <Link
                      href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex content-stretch items-center justify-center overflow-clip rounded-[8px] bg-[#0268a0] px-[17px] py-[15px]"
                    >
                      <span className="text-center text-[16px] leading-[1.2] font-semibold text-white capitalize">
                        Shop now
                      </span>
                    </Link>
                    {product.badge && index === 0 && (
                      <div className="absolute top-[9.52px] left-[58.52px] flex size-[66.959px] items-center justify-center">
                        <div className="-rotate-[7.1deg]">
                          <div className="flex size-[60px] flex-col content-stretch items-center justify-center overflow-clip rounded-[90px] border-[2.5px] border-solid border-[#0268a0] bg-[#f3fafe] px-[6px] py-[29px]">
                            <div className="flex flex-col content-stretch items-center gap-[3px] text-center text-[12px] font-extrabold tracking-[0.24px] text-[#0268a0] uppercase">
                              <p className="leading-[1.3] whitespace-pre-wrap">best</p>
                              <p className="leading-[1.15] whitespace-pre-wrap">seller</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureLabels.map((feature, featureIndex) => (
              <tr key={feature.key} className={featureIndex % 2 === 0 ? '' : 'bg-[#f5f5f5]'}>
                <td className="border-t border-solid border-[rgba(34,34,34,0.1)] px-[32px] py-[20px]">
                  <p className="text-[16px] leading-[1.2] font-semibold text-[#161f2b] capitalize">
                    {feature.label}
                  </p>
                </td>
                {products.map((product, productIndex) => (
                  <td
                    key={productIndex}
                    className="border-t border-solid border-[rgba(34,34,34,0.12)] px-[32px] py-[20px] text-center"
                  >
                    {typeof product.features[feature.key as keyof typeof product.features] ===
                    'boolean' ? (
                      product.features[feature.key as keyof typeof product.features] ? (
                        <div className="flex justify-center">
                          <Check className="size-[32px] text-[#0268a0]" strokeWidth={2} />
                        </div>
                      ) : null
                    ) : (
                      <p className="text-[16px] leading-[1.6] font-medium tracking-[-0.16px] whitespace-pre-wrap text-[#161f2b]">
                        {product.features[feature.key as keyof typeof product.features] as string}
                      </p>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
