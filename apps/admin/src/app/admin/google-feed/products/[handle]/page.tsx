'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ProductData {
  product: {
    id: string
    shopifyProductId: string
    title: string
    description: string
    handle: string
    vendor: string | null
    productType: string | null
    priceCents: number
    currency: string
    featuredImageUrl: string | null
    images: Array<{ url: string; alt?: string }>
    variants: Array<{ id?: string; sku?: string; barcode?: string; title?: string }>
    tags: string[]
    inventoryQuantity: number | null
    availability: string
    sku: string | null
    barcode: string | null
  }
  feedData: {
    isExcluded: boolean
    titleOverride: string | null
    descriptionOverride: string | null
    gtin: string | null
    mpn: string | null
    brandOverride: string | null
    googleCategoryId: string | null
    productType: string | null
    conditionOverride: string | null
    adult: boolean
    ageGroup: string | null
    gender: string | null
    color: string | null
    material: string | null
    pattern: string | null
    size: string | null
    customLabel0: string | null
    customLabel1: string | null
    customLabel2: string | null
    customLabel3: string | null
    customLabel4: string | null
    merchantStatus: string | null
    merchantIssues: Array<{ severity: string; description: string }>
  } | null
  effectiveData: {
    title: string
    description: string
    brand: string | null
    gtin: string | null
    mpn: string | null
    googleCategoryId: string | null
    productType: string | null
    condition: string
    availability: string
    isExcluded: boolean
  }
}

export default function GoogleFeedProductDetailPage() {
  const params = useParams()
  const handle = params.handle as string

  const [data, setData] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, string | boolean | null>>({})

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/admin/google-feed/products/${handle}`)
        if (res.ok) {
          const productData = await res.json()
          setData(productData)
          // Initialize form with current values
          setFormData({
            titleOverride: productData.feedData?.titleOverride || '',
            descriptionOverride: productData.feedData?.descriptionOverride || '',
            gtin: productData.feedData?.gtin || '',
            mpn: productData.feedData?.mpn || '',
            brandOverride: productData.feedData?.brandOverride || '',
            googleCategoryId: productData.feedData?.googleCategoryId || '',
            productType: productData.feedData?.productType || '',
            conditionOverride: productData.feedData?.conditionOverride || '',
            color: productData.feedData?.color || '',
            material: productData.feedData?.material || '',
            pattern: productData.feedData?.pattern || '',
            size: productData.feedData?.size || '',
            adult: productData.feedData?.adult || false,
            customLabel0: productData.feedData?.customLabel0 || '',
            customLabel1: productData.feedData?.customLabel1 || '',
            customLabel2: productData.feedData?.customLabel2 || '',
            customLabel3: productData.feedData?.customLabel3 || '',
            customLabel4: productData.feedData?.customLabel4 || '',
          })
        }
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [handle])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/google-feed/products/${handle}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const updated = await res.json()
        setData((prev) => prev ? { ...prev, feedData: updated.feedProduct } : null)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleExclude = async () => {
    try {
      await fetch(`/api/admin/google-feed/products/${handle}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually excluded' }),
      })
      window.location.reload()
    } catch (error) {
      console.error('Failed to exclude:', error)
    }
  }

  const handleInclude = async () => {
    try {
      await fetch(`/api/admin/google-feed/products/${handle}/include`, {
        method: 'POST',
      })
      window.location.reload()
    } catch (error) {
      console.error('Failed to include:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/google-feed/products" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Products
        </Link>
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    )
  }

  const { product, feedData, effectiveData } = data
  const isExcluded = feedData?.isExcluded || false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/google-feed/products" className="text-sm text-muted-foreground hover:text-foreground">
            Back to Products
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{product.title}</h1>
          <p className="text-muted-foreground">{product.handle}</p>
        </div>
        <div className="flex gap-2">
          {isExcluded ? (
            <button
              onClick={handleInclude}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Include in Feed
            </button>
          ) : (
            <button
              onClick={handleExclude}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Exclude from Feed
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isExcluded && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            This product is excluded from the Google Feed.
            {feedData?.excludeReason && ` Reason: ${feedData.excludeReason}`}
          </p>
        </div>
      )}

      {/* Merchant Issues */}
      {feedData?.merchantIssues && feedData.merchantIssues.length > 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="font-medium text-red-800">Merchant Center Issues</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-red-700">
            {feedData.merchantIssues.map((issue, i) => (
              <li key={i}>{issue.description}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Info */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold">Product Info (from Shopify)</h2>
            {product.featuredImageUrl && (
              <img
                src={product.featuredImageUrl}
                alt={product.title}
                className="mt-4 w-full rounded-lg"
              />
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Title</dt>
                <dd>{product.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vendor</dt>
                <dd>{product.vendor || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Product Type</dt>
                <dd>{product.productType || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">SKU</dt>
                <dd>{product.sku || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Barcode</dt>
                <dd>{product.barcode || '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd>${(product.priceCents / 100).toFixed(2)} {product.currency}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Availability</dt>
                <dd className="capitalize">{product.availability.replace('_', ' ')}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Feed Overrides */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold">Feed Data Overrides</h2>
            <p className="text-sm text-muted-foreground">
              Override Shopify data for the Google Feed
            </p>

            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Title Override</label>
                  <input
                    type="text"
                    value={String(formData.titleOverride || '')}
                    onChange={(e) => setFormData({ ...formData, titleOverride: e.target.value })}
                    placeholder={product.title}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Brand Override</label>
                  <input
                    type="text"
                    value={String(formData.brandOverride || '')}
                    onChange={(e) => setFormData({ ...formData, brandOverride: e.target.value })}
                    placeholder={product.vendor || ''}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Description Override</label>
                <textarea
                  value={String(formData.descriptionOverride || '')}
                  onChange={(e) => setFormData({ ...formData, descriptionOverride: e.target.value })}
                  placeholder={product.description}
                  rows={3}
                  className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">GTIN (UPC/EAN)</label>
                  <input
                    type="text"
                    value={String(formData.gtin || '')}
                    onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                    placeholder={product.barcode || ''}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">MPN</label>
                  <input
                    type="text"
                    value={String(formData.mpn || '')}
                    onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                    placeholder={product.sku || ''}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Google Category ID</label>
                  <input
                    type="text"
                    value={String(formData.googleCategoryId || '')}
                    onChange={(e) => setFormData({ ...formData, googleCategoryId: e.target.value })}
                    placeholder="e.g., 1234"
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Product Type</label>
                  <input
                    type="text"
                    value={String(formData.productType || '')}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    placeholder={product.productType || ''}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium">Condition</label>
                  <select
                    value={String(formData.conditionOverride || '')}
                    onChange={(e) => setFormData({ ...formData, conditionOverride: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Default (new)</option>
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Color</label>
                  <input
                    type="text"
                    value={String(formData.color || '')}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Size</label>
                  <input
                    type="text"
                    value={String(formData.size || '')}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Material</label>
                  <input
                    type="text"
                    value={String(formData.material || '')}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Pattern</label>
                  <input
                    type="text"
                    value={String(formData.pattern || '')}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.adult)}
                    onChange={(e) => setFormData({ ...formData, adult: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Adult content</span>
                </label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium">Custom Labels</h3>
                <div className="mt-2 grid gap-4 sm:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <label className="block text-sm text-muted-foreground">Label {i}</label>
                      <input
                        type="text"
                        value={String(formData[`customLabel${i}`] || '')}
                        onChange={(e) => setFormData({ ...formData, [`customLabel${i}`]: e.target.value })}
                        className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
