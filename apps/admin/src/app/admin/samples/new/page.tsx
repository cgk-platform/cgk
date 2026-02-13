'use client'

import { Card, CardContent, CardHeader, Button, Input, Label } from '@cgk-platform/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { SampleProduct, ShippingAddress } from '@/lib/creators-admin-ops'
import { SAMPLE_PRIORITIES } from '@/lib/creators-admin-ops'

export default function NewSampleRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [creatorId, setCreatorId] = useState('')
  const [creatorSearch, setCreatorSearch] = useState('')
  const [products, setProducts] = useState<SampleProduct[]>([
    { productId: '', productName: '', variant: '', quantity: 1 },
  ])
  const [priority, setPriority] = useState<'normal' | 'rush'>('normal')
  const [notes, setNotes] = useState('')

  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: '',
  })

  const updateProduct = (index: number, field: keyof SampleProduct, value: string | number) => {
    const updated = [...products]
    const product = updated[index]
    if (product) {
      updated[index] = { ...product, [field]: value }
      setProducts(updated)
    }
  }

  const addProduct = () => {
    setProducts([...products, { productId: '', productName: '', variant: '', quantity: 1 }])
  }

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    if (!creatorId) {
      alert('Please select a creator')
      return
    }

    const validProducts = products.filter((p) => p.productName.trim())
    if (validProducts.length === 0) {
      alert('Please add at least one product')
      return
    }

    if (!address.name || !address.line1 || !address.city || !address.state || !address.postal_code) {
      alert('Please fill in the shipping address')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/admin/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          products: validProducts,
          shippingAddress: address,
          priority,
          notes: notes || undefined,
        }),
      })

      if (res.ok) {
        router.push('/admin/samples')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create sample request')
      }
    } catch {
      alert('Failed to create sample request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/samples" className="text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">New Sample Request</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Creator</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="creator-search">Search Creator</Label>
            <Input
              id="creator-search"
              value={creatorSearch}
              onChange={(e) => setCreatorSearch(e.target.value)}
              placeholder="Enter creator name or email..."
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Type to search, then select from results
            </p>
          </div>

          {/* In a real implementation, this would search and show results */}
          <div>
            <Label htmlFor="creator-id">Creator ID (temporary)</Label>
            <Input
              id="creator-id"
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              placeholder="Enter creator ID directly"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Products</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.map((product, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="flex-1">
                <Label>Product Name</Label>
                <Input
                  value={product.productName}
                  onChange={(e) => updateProduct(idx, 'productName', e.target.value)}
                  placeholder="Enter product name"
                  className="mt-1"
                />
              </div>
              <div className="w-24">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={product.quantity}
                  onChange={(e) => updateProduct(idx, 'quantity', Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label>Variant (optional)</Label>
                <Input
                  value={product.variant || ''}
                  onChange={(e) => updateProduct(idx, 'variant', e.target.value)}
                  placeholder="Size, color, etc."
                  className="mt-1"
                />
              </div>
              {products.length > 1 && (
                <button
                  onClick={() => removeProduct(idx)}
                  className="mt-7 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addProduct}>
            + Add Product
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Shipping Address</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Recipient Name</Label>
              <Input
                id="name"
                value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line1">Address Line 1</Label>
              <Input
                id="line1"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="line2">Address Line 2 (optional)</Label>
              <Input
                id="line2"
                value={address.line2 || ''}
                onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="postal">Postal Code</Label>
              <Input
                id="postal"
                value={address.postal_code}
                onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={address.phone || ''}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Options</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Priority</Label>
            <div className="mt-2 flex gap-4">
              {SAMPLE_PRIORITIES.map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="rounded"
                  />
                  <span className="capitalize">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this request..."
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/samples">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating...' : 'Create Request'}
        </Button>
      </div>
    </div>
  )
}
