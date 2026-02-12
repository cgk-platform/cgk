/**
 * Dynamic Landing Page Route
 *
 * Renders landing pages from database configuration using the block system.
 * Each tenant can have multiple landing pages with unique slugs.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenantSlug } from '@/lib/tenant'
import { getLandingPage } from '@/lib/landing-pages'
import { BlockList } from '@/components/blocks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface LandingPageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * Generate metadata for the landing page
 */
export async function generateMetadata({
  params,
}: LandingPageProps): Promise<Metadata> {
  const { slug } = await params
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    return {}
  }

  const page = await getLandingPage(tenantSlug, slug)

  if (!page) {
    return {}
  }

  const { seo, title } = page

  return {
    title: seo.metaTitle || title,
    description: seo.metaDescription,
    openGraph: seo.ogImage
      ? {
          images: [{ url: seo.ogImage }],
        }
      : undefined,
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: seo.canonicalUrl
      ? { canonical: seo.canonicalUrl }
      : undefined,
  }
}

/**
 * Landing Page Component
 */
export default async function LandingPage({ params }: LandingPageProps) {
  const { slug } = await params
  const tenantSlug = await getTenantSlug()

  if (!tenantSlug) {
    notFound()
  }

  const page = await getLandingPage(tenantSlug, slug)

  if (!page) {
    notFound()
  }

  // Page settings
  const { settings, blocks } = page
  const showNavigation = settings.showNavigation !== false
  const showFooter = settings.showFooter !== false

  return (
    <>
      {/* Hide navigation if configured */}
      {!showNavigation && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              header { display: none !important; }
              main { margin-top: 0 !important; }
            `,
          }}
        />
      )}

      {/* Hide footer if configured */}
      {!showFooter && (
        <style
          dangerouslySetInnerHTML={{
            __html: `footer { display: none !important; }`,
          }}
        />
      )}

      {/* Page background */}
      {settings.backgroundColor && (
        <style
          dangerouslySetInnerHTML={{
            __html: `main { background-color: ${settings.backgroundColor}; }`,
          }}
        />
      )}

      {/* Render blocks */}
      <BlockList blocks={blocks} />
    </>
  )
}
