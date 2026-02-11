'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface ImageStatus {
  productId: string
  productTitle: string
  handle: string
  imageUrl: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  status: 'approved' | 'warning' | 'disapproved' | 'pending'
  issues: string[]
  isOptimized: boolean
}

interface ImagesResponse {
  images: ImageStatus[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  requirements: {
    minWidth: number
    minHeight: number
    apparelMinWidth: number
    apparelMinHeight: number
    maxFileSize: string
    supportedFormats: string[]
    recommendations: string[]
  }
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'issues', label: 'Issues' },
]

export default function GoogleFeedImagesPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ImagesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [optimizing, setOptimizing] = useState(false)

  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    async function loadImages() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (status !== 'all') params.set('status', status)
        params.set('page', String(page))

        const res = await fetch(`/api/admin/google-feed/images?${params}`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch (error) {
        console.error('Failed to load images:', error)
      } finally {
        setLoading(false)
      }
    }
    loadImages()
  }, [status, page])

  const handleOptimize = async () => {
    if (selectedImages.size === 0) return

    setOptimizing(true)
    try {
      const res = await fetch('/api/admin/google-feed/images/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedImages),
          options: {
            removeBackground: false,
            quality: 85,
          },
        }),
      })

      if (res.ok) {
        setSelectedImages(new Set())
        // Reload images
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to optimize:', error)
    } finally {
      setOptimizing(false)
    }
  }

  const toggleSelection = (productId: string) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedImages(newSelected)
  }

  const selectAll = () => {
    if (data) {
      setSelectedImages(new Set(data.images.map((img) => img.productId)))
    }
  }

  const deselectAll = () => {
    setSelectedImages(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feed Images</h1>
          <p className="text-muted-foreground">
            Manage product images for Google Shopping
          </p>
        </div>
        <Link
          href="/admin/google-feed"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Overview
        </Link>
      </div>

      {/* Requirements Info */}
      {data?.requirements && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="font-medium">Image Requirements</h3>
          <div className="mt-2 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Minimum dimensions</p>
              <p>
                {data.requirements.minWidth}x{data.requirements.minHeight}px (non-apparel)
                <br />
                {data.requirements.apparelMinWidth}x{data.requirements.apparelMinHeight}px (apparel)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Supported formats</p>
              <p>{data.requirements.supportedFormats.join(', ')}</p>
            </div>
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {data.requirements.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters and Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/google-feed/images?status=${filter.value}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                status === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {selectedImages.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedImages.size} selected
            </span>
            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {optimizing ? 'Optimizing...' : 'Optimize Selected'}
            </button>
            <button
              onClick={deselectAll}
              className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border p-4">
              <div className="aspect-square rounded bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : data?.images.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">No images found.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={selectAll} className="hover:text-foreground">
              Select all
            </button>
            <span>|</span>
            <span>
              Showing {data?.images.length} of {data?.pagination.total} images
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data?.images.map((image) => (
              <div
                key={image.productId}
                className={`relative rounded-lg border p-4 transition-colors ${
                  selectedImages.has(image.productId)
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="absolute right-2 top-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.productId)}
                    onChange={() => toggleSelection(image.productId)}
                    className="h-4 w-4 rounded"
                  />
                </div>

                <div className="aspect-square overflow-hidden rounded bg-muted">
                  {image.imageUrl ? (
                    <img
                      src={image.thumbnailUrl || image.imageUrl}
                      alt={image.productTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <Link
                    href={`/admin/google-feed/products/${image.handle}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {image.productTitle}
                  </Link>
                  {image.width && image.height && (
                    <p className="text-xs text-muted-foreground">
                      {image.width} x {image.height}
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <ImageStatusBadge status={image.status} />
                  {image.isOptimized && (
                    <span className="text-xs text-green-600">Optimized</span>
                  )}
                </div>

                {image.issues.length > 0 && (
                  <ul className="mt-2 text-xs text-red-600">
                    {image.issues.slice(0, 2).map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                    {image.issues.length > 2 && (
                      <li>+{image.issues.length - 2} more</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/google-feed/images?status=${status}&page=${page - 1}`}
                  className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              {page < data.pagination.totalPages && (
                <Link
                  href={`/admin/google-feed/images?status=${status}&page=${page + 1}`}
                  className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ImageStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    disapproved: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  )
}
