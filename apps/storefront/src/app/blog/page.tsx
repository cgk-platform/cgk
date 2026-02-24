/**
 * Blog Listing Page
 *
 * Displays articles from the Shopify blog in a grid layout.
 * Matches Liquid theme: grid layout, large images, no dates/authors shown.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'

import { createStorefrontClient, getBlogArticles } from '@cgk-platform/shopify'
import type { ShopifyArticle } from '@cgk-platform/shopify'

import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  return {
    title: `Blog | ${tenant?.name ?? 'Store'}`,
    description: `Read the latest from ${tenant?.name ?? 'our'} blog — tips, guides, and updates.`,
  }
}

export default async function BlogPage() {
  return (
    <div className="mx-auto max-w-store px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <a href="/" className="hover:text-cgk-navy">Home</a>
          </li>
          <li>/</li>
          <li className="text-cgk-navy">Blog</li>
        </ol>
      </nav>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-cgk-navy">Blog</h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-600">
          Tips, guides, and the latest updates from our team.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[4/3] rounded-lg bg-gray-200" />
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        }
      >
        <BlogArticles />
      </Suspense>
    </div>
  )
}

async function BlogArticles() {
  const config = await getTenantConfig()

  if (!config?.shopify) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Configure your Shopify store connection to display blog articles.
      </div>
    )
  }

  const client = createStorefrontClient({
    storeDomain: config.shopify.storeDomain,
    storefrontAccessToken: config.shopify.storefrontAccessToken,
  })

  const blog = await getBlogArticles(client, 'news', 12)

  if (!blog || blog.articles.edges.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <h2 className="text-lg font-semibold text-cgk-navy">No articles yet</h2>
        <p className="mt-2 text-gray-500">
          Check back soon for new content.
        </p>
      </div>
    )
  }

  const articles = blog.articles.edges.map((e) => e.node)

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}

function ArticleCard({ article }: { article: ShopifyArticle }) {
  const href = `/blog/${article.handle}`

  return (
    <a href={href} className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg">
      {article.image && (
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={article.image.url}
            alt={article.image.altText ?? article.title}
            width={article.image.width}
            height={article.image.height}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-5">
        <h2 className="text-lg font-bold text-cgk-navy group-hover:underline">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-gray-600">
            {article.excerpt}
          </p>
        )}
        {article.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-cgk-light-blue/30 px-2.5 py-0.5 text-xs font-medium text-cgk-navy"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  )
}
