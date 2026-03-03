/**
 * Wishlist Page Components
 *
 * Client components for wishlist interactivity.
 */

'use client'

import { Button, cn } from '@cgk-platform/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

import { EmptyState } from '@/components/account/EmptyState'
import { ShareWishlistModal } from '@/components/account/ShareWishlistModal'
import { WishlistCard } from '@/components/account/WishlistCard'
import { moveToCart, removeFromWishlist, shareWishlist } from '@/lib/account/api'
import { getContent, interpolateContent } from '@/lib/account/content'
import type { PortalContentStrings, Wishlist } from '@/lib/account/types'

interface WishlistClientProps {
  wishlist: Wishlist
  content: PortalContentStrings
}

export function WishlistClient({ wishlist, content }: WishlistClientProps) {
  const router = useRouter()
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [movingToCartIds, setMovingToCartIds] = useState<Set<string>>(new Set())
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const handleRemove = useCallback(async (itemId: string) => {
    setRemovingIds((prev) => new Set([...prev, itemId]))
    try {
      await removeFromWishlist(wishlist.id, itemId)
      router.refresh()
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [wishlist.id, router])

  const handleMoveToCart = useCallback(async (itemId: string) => {
    setMovingToCartIds((prev) => new Set([...prev, itemId]))
    try {
      await moveToCart(wishlist.id, itemId)
      router.refresh()
    } catch (error) {
      console.error('Failed to move to cart:', error)
    } finally {
      setMovingToCartIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [wishlist.id, router])

  const handleShare = async () => {
    try {
      const result = await shareWishlist(wishlist.id, 7) // 7 days expiry
      setShareUrl(result.shareUrl)
      setShowShareModal(true)
    } catch (error) {
      console.error('Failed to share wishlist:', error)
    }
  }

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 3000)
    }
  }

  if (wishlist.items.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        }
        title={getContent(content, 'wishlist.empty')}
        description={getContent(content, 'wishlist.empty_description')}
        action={
          <Link
            href="/products"
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3',
              'text-sm font-medium text-[hsl(var(--portal-primary-foreground))]',
              'transition-colors hover:bg-[hsl(var(--portal-primary))]/90',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-ring))] focus:ring-offset-2'
            )}
          >
            {getContent(content, 'common.start_shopping')}
          </Link>
        }
      />
    )
  }

  const itemCount = wishlist.items.length
  const inStockCount = wishlist.items.filter((item) => item.inStock).length

  return (
    <>
      {/* Wishlist Header Bar */}
      <div
        className={cn(
          'mb-6 flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between',
          'border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--portal-primary))]/10">
            <svg
              className="h-6 w-6 text-[hsl(var(--portal-primary))]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">
              {interpolateContent(getContent(content, 'wishlist.items_count'), { count: itemCount })}
            </p>
            <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
              {inStockCount} of {itemCount} items in stock
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleShare}
            className="rounded-lg"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {getContent(content, 'wishlist.share')}
          </Button>
        </div>
      </div>

      {/* Wishlist Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlist.items.map((item) => (
          <WishlistCard
            key={item.id}
            item={item}
            content={content}
            currencyCode="USD"
            onRemove={handleRemove}
            onMoveToCart={handleMoveToCart}
            isRemoving={removingIds.has(item.id)}
            isMovingToCart={movingToCartIds.has(item.id)}
          />
        ))}
      </div>

      {/* Share Modal */}
      <ShareWishlistModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false)
          setShareUrl(null)
          setCopiedToClipboard(false)
        }}
        shareUrl={shareUrl || ''}
        onCopy={handleCopyLink}
        copied={copiedToClipboard}
        content={content}
      />
    </>
  )
}

export function WishlistSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Bar Skeleton */}
      <div className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[hsl(var(--portal-muted))]" />
            <div className="space-y-2">
              <div className="h-5 w-20 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-32 rounded bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-lg bg-[hsl(var(--portal-muted))]" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))]"
          >
            <div className="aspect-square bg-[hsl(var(--portal-muted))]" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-4 w-1/2 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-5 w-20 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="h-10 rounded-lg bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
