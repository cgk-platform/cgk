/**
 * Wishlist Page
 *
 * Displays saved items with options to move to cart or remove.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { getDefaultWishlist } from '@/lib/account/api'
import { defaultContent, getContent } from '@/lib/account/content'

import { WishlistClient, WishlistSkeleton } from './components'

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'View and manage your saved items',
}

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(defaultContent, 'wishlist.title')}
          </h1>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </Link>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          Items you have saved for later
        </p>
      </div>

      {/* Wishlist Content */}
      <Suspense fallback={<WishlistSkeleton />}>
        <WishlistContent />
      </Suspense>
    </div>
  )
}

async function WishlistContent() {
  const wishlist = await getDefaultWishlist()

  return <WishlistClient wishlist={wishlist} content={defaultContent} />
}
