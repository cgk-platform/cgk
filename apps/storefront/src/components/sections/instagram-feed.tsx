/**
 * Instagram Feed Section
 *
 * Grid of Instagram images with link to profile.
 * Uses static images initially.
 */

import Image from 'next/image'

interface InstagramImage {
  src: string
  alt?: string
}

interface InstagramFeedProps {
  images: InstagramImage[]
  handle?: string
}

export function InstagramFeed({
  images,
  handle = '@CGKLINENS',
}: InstagramFeedProps) {
  if (images.length === 0) return null

  return (
    <section className="py-16">
      <div className="mx-auto max-w-store px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-cgk-navy md:text-3xl">
            Follow Us on Instagram
          </h2>
          <a
            href={`https://www.instagram.com/${handle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-cgk-navy/70 transition-colors hover:text-cgk-navy"
          >
            {handle}
          </a>
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-4">
          {images.slice(0, 6).map((img, i) => (
            <a
              key={i}
              href={`https://www.instagram.com/${handle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
            >
              <Image
                src={img.src}
                alt={img.alt ?? `Instagram post ${i + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, 16vw"
              />
              <div className="absolute inset-0 bg-cgk-navy/0 transition-colors group-hover:bg-cgk-navy/20" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
