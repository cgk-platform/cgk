/**
 * Gallery Management Page
 * UGC photo moderation with approval workflow
 */

import { sql, withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { GalleryClient } from './gallery-client'
import { GalleryStats } from './gallery-stats'

import type { UGCGalleryStats, UGCSubmission } from '@/lib/admin-utilities/types'

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Editorial Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-widest text-stone-400">
            Content Moderation
          </p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-stone-900">
            Gallery
          </h1>
          <p className="mt-2 text-stone-600">
            Review and moderate customer before/after submissions
          </p>
        </div>
      </header>

      {/* Stats Section */}
      <Suspense fallback={<GalleryStatsSkeleton />}>
        <GalleryStatsLoader />
      </Suspense>

      {/* Gallery Grid */}
      <Suspense fallback={<GalleryGridSkeleton />}>
        <GalleryGridLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headerList = await headers()
  return headerList.get('x-tenant-slug')
}

async function GalleryStatsLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <GalleryStats stats={{ total: 0, pending: 0, approved: 0, rejected: 0 }} />
  }

  const stats = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM ugc_submissions
    `
    const row = result.rows[0] || {}
    return {
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      approved: Number(row.approved || 0),
      rejected: Number(row.rejected || 0),
    } as UGCGalleryStats
  })

  return <GalleryStats stats={stats} />
}

async function GalleryGridLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <GalleryClient initialSubmissions={[]} />
  }

  const submissions = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        customer_name as "customerName",
        customer_email as "customerEmail",
        customer_phone as "customerPhone",
        before_image_url as "beforeImageUrl",
        after_image_url as "afterImageUrl",
        testimonial,
        products_used as "productsUsed",
        duration_days as "durationDays",
        consent_marketing as "consentMarketing",
        consent_terms as "consentTerms",
        status,
        review_notes as "reviewNotes",
        reviewed_by as "reviewedBy",
        reviewed_at as "reviewedAt",
        source,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ugc_submissions
      ORDER BY created_at DESC
      LIMIT 100
    `
    return result.rows as UGCSubmission[]
  })

  return <GalleryClient initialSubmissions={submissions} />
}

function GalleryStatsSkeleton() {
  return (
    <section className="border-b border-stone-200 bg-white px-6 py-6">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-stone-100"
          />
        ))}
      </div>
    </section>
  )
}

function GalleryGridSkeleton() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg bg-stone-200"
            />
          ))}
        </div>
      </div>
    </main>
  )
}
