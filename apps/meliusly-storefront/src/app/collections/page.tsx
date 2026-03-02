import Link from 'next/link'
import Image from 'next/image'

const collections = [
  {
    handle: 'sleeper-sofa-support',
    name: 'Sleeper Sofa Support',
    description: 'Transform your sleeper sofa into a comfortable bed',
    image: '/assets/sleepersaver-thumb.webp',
    productCount: 3,
  },
  {
    handle: 'sofa-chair-support',
    name: 'Sofa & Chair Support',
    description: 'Restore comfort to worn furniture',
    image: '/assets/classic-sleeper-thumb.webp',
    productCount: 2,
  },
  {
    handle: 'bed-support',
    name: 'Bed Support Boards',
    description: 'Premium support for mattresses',
    image: '/assets/flex-sleeper-thumb.webp',
    productCount: 4,
  },
]

export default function CollectionsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="flex w-full flex-col items-center gap-[30px] bg-[#f3fafe] px-[80px] py-[80px]">
        <h1 className="text-center text-[40px] leading-[1.3] font-semibold text-[#161f2b]">
          Shop All Collections
        </h1>
        <p className="max-w-[768px] text-center text-[18px] leading-[1.6] font-medium text-[#161f2b]/80">
          Browse our complete range of support boards for sleeper sofas, chairs, and beds
        </p>
      </div>

      {/* Collections Grid */}
      <div className="flex w-full justify-center px-[80px] py-[80px]">
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-[40px] md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/collections/${collection.handle}`}
              className="group flex flex-col gap-[20px] rounded-[12px] border border-solid border-[rgba(34,34,34,0.12)] bg-white p-[24px] transition-all duration-200 hover:border-[#0268a0] hover:shadow-lg"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-[#f7f7f7]">
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  className="object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-[22px] leading-[1.3] font-semibold text-[#161f2b] capitalize">
                  {collection.name}
                </h2>
                <p className="text-[15px] leading-[1.6] font-medium tracking-[-0.15px] text-[#161f2b]/70">
                  {collection.description}
                </p>
                <p className="text-[14px] font-medium text-[#0268a0]">
                  {collection.productCount} {collection.productCount === 1 ? 'product' : 'products'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
