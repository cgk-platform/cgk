/**
 * Blog Article Page
 *
 * Individual blog article with full content rendered from Shopify.
 * Includes breadcrumbs, author info, published date, and tags.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

import { createStorefrontClient, getArticleByHandle } from '@cgk-platform/shopify'

import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getTenantConfig } from '@/lib/tenant'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ArticlePageProps {
  params: Promise<{
    handle: string
  }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { handle } = await params
  const config = await getTenantConfig()

  if (!config?.shopify) {
    return { title: 'Article | Store' }
  }

  const client = createStorefrontClient({
    storeDomain: config.shopify.storeDomain,
    storefrontAccessToken: config.shopify.storefrontAccessToken,
  })

  const article = await getArticleByHandle(client, 'news', handle)

  if (!article) {
    return { title: 'Article Not Found | Store' }
  }

  return {
    title: article.seo?.title || `${article.title} | ${config.name ?? 'Store'}`,
    description: article.seo?.description || article.excerpt?.slice(0, 160) || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? '',
      type: 'article',
      publishedTime: article.publishedAt,
      authors: article.authorV2 ? [article.authorV2.name] : undefined,
      images: article.image
        ? [
            {
              url: article.image.url,
              width: article.image.width,
              height: article.image.height,
              alt: article.image.altText ?? article.title,
            },
          ]
        : [],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { handle } = await params
  const config = await getTenantConfig()

  if (!config?.shopify) {
    notFound()
  }

  const client = createStorefrontClient({
    storeDomain: config.shopify.storeDomain,
    storefrontAccessToken: config.shopify.storefrontAccessToken,
  })

  const article = await getArticleByHandle(client, 'news', handle)

  if (!article) {
    notFound()
  }

  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const siteUrl = `${protocol}://${host}`

  return (
    <div className="mx-auto max-w-store px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: siteUrl },
          { name: 'Blog', url: `${siteUrl}/blog` },
          { name: article.title, url: `${siteUrl}/blog/${handle}` },
        ]}
      />

      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-cgk-navy">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/blog" className="hover:text-cgk-navy">
              Blog
            </Link>
          </li>
          <li>/</li>
          <li className="text-cgk-navy">{article.title}</li>
        </ol>
      </nav>

      <article className="mx-auto max-w-3xl">
        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-cgk-navy md:text-4xl">{article.title}</h1>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            {article.authorV2 && <span>By {article.authorV2.name}</span>}
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          {article.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-cgk-light-blue/30 px-2.5 py-0.5 text-xs font-medium text-cgk-navy"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {article.image && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <img
              src={article.image.url}
              alt={article.image.altText ?? article.title}
              width={article.image.width}
              height={article.image.height}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="prose prose-lg prose-headings:text-cgk-navy prose-a:text-cgk-navy prose-a:underline hover:prose-a:text-cgk-navy/80 max-w-none"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* Back to Blog */}
        <div className="mt-12 border-t pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-cgk-navy hover:underline"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Blog
          </Link>
        </div>
      </article>
    </div>
  )
}
