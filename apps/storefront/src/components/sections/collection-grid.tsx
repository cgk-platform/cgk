/**
 * Collection Grid Section
 *
 * Grid of collection cards with images, linking to collection pages.
 */

import Image from 'next/image'
import Link from 'next/link'

interface CollectionCard {
  title: string
  href: string
  imageUrl?: string
}

interface CollectionGridProps {
  title?: string
  subtitle?: string
  collections: CollectionCard[]
}

export function CollectionGrid({
  title = 'Shop By Collection',
  subtitle,
  collections,
}: CollectionGridProps) {
  if (collections.length === 0) return null

  return (
    <section className="py-16">
      <div className="mx-auto max-w-store px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-cgk-navy md:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-gray-600">{subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {collections.map((col) => (
            <Link
              key={col.href}
              href={col.href}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-cgk-light-blue"
            >
              {col.imageUrl && (
                <Image
                  src={col.imageUrl}
                  alt={col.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-cgk-navy/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-base font-semibold text-white md:text-lg">
                  {col.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
