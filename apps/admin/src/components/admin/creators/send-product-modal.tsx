'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Minus, Package, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'

import { Alert, AlertDescription, Badge, Button, Input } from '@cgk/ui'

import type { ShippingAddress, ShipmentProduct } from '../../../lib/creators/lifecycle-types'

interface ShopifyVariant {
  id: string
  title: string
  sku: string
  price: string
  inventoryQuantity: number
  availableForSale: boolean
}

interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  images: { url: string; altText?: string }[]
  variants: ShopifyVariant[]
  status: string
}

interface SendProductModalProps {
  creatorId: string
  creatorName: string
  initialAddress?: ShippingAddress
  onClose: () => void
  onSuccess?: (shipmentId: string) => void
}

export function SendProductModal({
  creatorId,
  creatorName,
  initialAddress,
  onClose,
  onSuccess,
}: SendProductModalProps) {
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ShipmentProduct[]>([])
  const [address, setAddress] = useState<ShippingAddress>(
    initialAddress || {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    }
  )
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/available?limit=50`)
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.products)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function addProduct(product: ShopifyProduct, variant: ShopifyVariant) {
    const existing = selectedProducts.find((p) => p.variantId === variant.id)
    if (existing) {
      if (existing.quantity < 5) {
        setSelectedProducts((prev) =>
          prev.map((p) =>
            p.variantId === variant.id ? { ...p, quantity: p.quantity + 1 } : p
          )
        )
      }
      return
    }

    setSelectedProducts((prev) => [
      ...prev,
      {
        variantId: variant.id,
        title: `${product.title}${variant.title !== 'Default Title' ? ` - ${variant.title}` : ''}`,
        quantity: 1,
        sku: variant.sku,
        imageUrl: product.images[0]?.url,
      },
    ])
  }

  function updateQuantity(variantId: string, delta: number) {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.variantId !== variantId) return p
        const newQty = Math.max(1, Math.min(5, p.quantity + delta))
        return { ...p, quantity: newQty }
      })
    )
  }

  function removeProduct(variantId: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.variantId !== variantId))
  }

  function validateAddress(): boolean {
    return !!(address.line1 && address.city && address.state && address.postalCode && address.country)
  }

  async function handleSubmit() {
    if (selectedProducts.length === 0) {
      setError('Please select at least one product')
      return
    }

    if (!validateAddress()) {
      setError('Please fill in all required address fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: selectedProducts,
          shippingAddress: address,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create shipment')
      }

      const data = await res.json()
      onSuccess?.(data.shipment.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Send Products to {creatorName}</h2>
            <p className="text-sm text-muted-foreground">
              Select products to send as creator samples
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Address Section */}
          <div className="border-b p-6">
            <h3 className="mb-3 font-medium">Shipping Address</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Address Line 1 *"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="Address Line 2 (optional)"
                  value={address.line2 || ''}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
              </div>
              <Input
                placeholder="City *"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
              <Input
                placeholder="State/Province *"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
              />
              <Input
                placeholder="Postal Code *"
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
              />
              <Input
                placeholder="Country *"
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="border-b p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Select Products</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{product.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {product.variants.map((variant) => {
                            const selected = selectedProducts.find(
                              (p) => p.variantId === variant.id
                            )
                            return (
                              <Button
                                key={variant.id}
                                variant={selected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => addProduct(product, variant)}
                                disabled={!variant.availableForSale}
                              >
                                {variant.title !== 'Default Title' && (
                                  <span className="mr-1">{variant.title}</span>
                                )}
                                <span className="text-xs opacity-70">${variant.price}</span>
                                {selected && (
                                  <Badge variant="secondary" className="ml-1 text-xs">
                                    x{selected.quantity}
                                  </Badge>
                                )}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Products */}
          <div className="border-b p-6">
            <h3 className="mb-3 font-medium">
              Selected ({selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''})
            </h3>
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products selected</p>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.variantId}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{product.title}</div>
                        {product.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(product.variantId, -1)}
                        disabled={product.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{product.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(product.variantId, 1)}
                        disabled={product.quantity >= 5}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(product.variantId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="p-6">
            <h3 className="mb-3 font-medium">Notes (optional)</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for this shipment..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || selectedProducts.length === 0}>
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              Create Sample Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
