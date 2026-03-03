'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Switch } from '@cgk-platform/ui'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import type { BrandSummary } from '../../../../../types/platform'

/**
 * Brand settings page
 *
 * Configure brand-specific settings:
 * - Brand details (name, slug, logo)
 * - Status (active, paused)
 * - Integration toggles
 * - Feature flags
 */
export default function BrandSettingsPage() {
  const params = useParams()
  const brandId = params.id as string

  const [brand, setBrand] = useState<BrandSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Fetch brand details
  const fetchBrand = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/platform/overview/brands?pageSize=50')
      if (response.ok) {
        const result = await response.json()
        const foundBrand = result.brands.find((b: BrandSummary) => b.id === brandId)
        if (foundBrand) {
          setBrand(foundBrand)
          setName(foundBrand.name)
          setIsActive(foundBrand.status === 'active')
        } else {
          setError('Brand not found')
        }
      } else {
        setError('Failed to fetch brand')
      }
    } catch (err) {
      console.error('Failed to fetch brand:', err)
      setError('Failed to fetch brand')
    } finally {
      setIsLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  const handleSave = useCallback(async () => {
    if (!brand) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/platform/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          status: isActive ? 'active' : 'paused',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      // Refresh brand data
      await fetchBrand()
    } catch (err) {
      console.error('Failed to save:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }, [brand, brandId, name, isActive, fetchBrand])

  if (isLoading) {
    return <SettingsSkeleton />
  }

  if (error || !brand) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-muted-foreground">{error || 'Brand not found'}</p>
        <Link href="/brands">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Brands
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/brands/${brandId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brand Settings</h1>
            <p className="text-muted-foreground">{brand.name}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">General Settings</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter brand name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={brand.slug} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              The slug cannot be changed after creation.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Active Status</p>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Brand is live and processing orders' : 'Brand is paused'}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Integration Status (Read-only) */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Integrations</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Shopify</p>
              <p className="text-sm text-muted-foreground">
                {brand.shopifyConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <div
              className={`h-3 w-3 rounded-full ${brand.shopifyConnected ? 'bg-green-500' : 'bg-gray-300'}`}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Stripe</p>
              <p className="text-sm text-muted-foreground">
                {brand.stripeConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <div
              className={`h-3 w-3 rounded-full ${brand.stripeConnected ? 'bg-green-500' : 'bg-gray-300'}`}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Integration settings are managed within each brand&apos;s admin portal.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div>
              <p className="font-medium">Delete Brand</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this brand and all its data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete Brand
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-48 animate-pulse rounded-xl border bg-card" />
      <div className="h-32 animate-pulse rounded-xl border bg-card" />
    </div>
  )
}
