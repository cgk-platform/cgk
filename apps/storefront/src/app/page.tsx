/**
 * Homepage
 *
 * Landing page for the storefront with hero section and featured products.
 */

import { Suspense } from 'react'

import { ProductGrid } from '@/components/products'
import { getCommerceProvider } from '@/lib/commerce'
import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const tenant = await getTenantConfig()

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background px-4 py-16 md:py-24">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Welcome to {tenant?.name ?? 'Our Store'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Discover our amazing products and find exactly what you need.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/products"
              className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Shop Now
            </a>
            <a
              href="/collections"
              className="rounded-lg border px-8 py-3 text-lg font-semibold transition-colors hover:bg-muted"
            >
              Browse Collections
            </a>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="mt-1 text-muted-foreground">
              Our most popular items
            </p>
          </div>
          <a
            href="/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All
          </a>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-square rounded-lg bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <FeaturedProducts />
        </Suspense>
      </section>

      {/* Categories Grid */}
      <section className="bg-muted/30 px-4 py-16">
        <div className="container mx-auto">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Shop by Category
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <CategoryCard
              title="New Arrivals"
              description="Check out our latest products"
              href="/collections/new-arrivals"
            />
            <CategoryCard
              title="Best Sellers"
              description="Our most popular items"
              href="/collections/best-sellers"
            />
            <CategoryCard
              title="On Sale"
              description="Great deals on select items"
              href="/collections/sale"
            />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold">Stay Updated</h2>
          <p className="mt-2 text-muted-foreground">
            Subscribe to our newsletter for exclusive deals and updates.
          </p>
          <form className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-lg border bg-transparent px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

async function FeaturedProducts() {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Configure your store to display products here
      </div>
    )
  }

  const result = await commerce.products.list({
    first: 8,
    sortKey: 'created_at',
    reverse: true,
  })

  if (result.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No products available yet. Add products to your store to display them here.
      </div>
    )
  }

  return (
    <ProductGrid
      products={result.items}
      columns={{ sm: 2, md: 3, lg: 4 }}
      priorityCount={4}
    />
  )
}

interface CategoryCardProps {
  title: string
  description: string
  href: string
}

function CategoryCard({ title, description, href }: CategoryCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center justify-center rounded-lg border bg-background p-8 text-center transition-all hover:border-primary hover:shadow-md"
    >
      <h3 className="text-lg font-semibold group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </a>
  )
}
