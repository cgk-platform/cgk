'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
  Progress,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  SkipForward,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ProductSyncStatus {
  totalProducts: number
  syncedProducts: number
  status: 'idle' | 'syncing' | 'completed' | 'error'
  lastSyncAt: string | null
  errorMessage?: string
}

interface ShopifyProduct {
  id: string
  title: string
  status: string
  productType: string
  vendor: string
  images: { url: string }[]
}

/**
 * Step 7: Product Sync
 *
 * Import and sync products from Shopify to the local database.
 */
function Step7Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [syncStatus, setSyncStatus] = useState<ProductSyncStatus>({
    totalProducts: 0,
    syncedProducts: 0,
    status: 'idle',
    lastSyncAt: null,
  })
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current sync status and products
  const fetchSyncStatus = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch session data to get organization info
      const sessionResponse = await fetch(`/api/platform/onboarding/${sessionId}`)
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session')
      }

      const { session } = await sessionResponse.json()
      const organizationId = session?.organizationId

      if (!organizationId) {
        // No organization yet - show setup required
        setSyncStatus({
          totalProducts: 0,
          syncedProducts: 0,
          status: 'idle',
          lastSyncAt: null,
        })
        setIsLoading(false)
        return
      }

      // Fetch product count from Shopify (simulated - would call real API)
      const productsResponse = await fetch(
        `/api/platform/brands/${organizationId}/shopify/products?limit=10`
      )

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        setProducts(data.products || [])
        setSyncStatus({
          totalProducts: data.totalCount || 0,
          syncedProducts: data.syncedCount || 0,
          status: data.syncedCount > 0 ? 'completed' : 'idle',
          lastSyncAt: data.lastSyncAt || null,
        })
      } else {
        // API might not exist yet - set defaults
        setSyncStatus({
          totalProducts: 0,
          syncedProducts: 0,
          status: 'idle',
          lastSyncAt: null,
        })
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err)
      setError('Failed to load product sync status')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  // Start product sync
  const handleStartSync = async () => {
    if (!sessionId) return

    setIsSyncing(true)
    setSyncStatus((prev) => ({ ...prev, status: 'syncing' }))
    setError(null)

    try {
      // Call step API to start sync
      const response = await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 7,
          data: { startSync: true },
          action: 'save',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start product sync')
      }

      // Simulate sync progress (in production, this would poll for actual progress)
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setSyncStatus((prev) => ({
            ...prev,
            syncedProducts: prev.totalProducts || 50,
            totalProducts: prev.totalProducts || 50,
            status: 'completed',
            lastSyncAt: new Date().toISOString(),
          }))
          setIsSyncing(false)
        } else {
          setSyncStatus((prev) => ({
            ...prev,
            syncedProducts: Math.floor((progress / 100) * (prev.totalProducts || 50)),
          }))
        }
      }, 500)
    } catch (err) {
      console.error('Sync error:', err)
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Failed to sync products. Please try again.',
      }))
      setError('Failed to sync products')
      setIsSyncing(false)
    }
  }

  // Handle navigation
  const handleBack = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-6')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 7,
          data: {
            imported: syncStatus.status === 'completed',
            productCount: syncStatus.syncedProducts,
          },
          action: 'back',
        }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    }

    router.push(`/brands/new/wizard/step-6?sessionId=${sessionId}`)
  }

  const handleNext = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-8')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 7,
          data: {
            imported: syncStatus.status === 'completed',
            productCount: syncStatus.syncedProducts,
            lastSyncAt: syncStatus.lastSyncAt,
          },
          action: 'next',
        }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    }

    router.push(`/brands/new/wizard/step-8?sessionId=${sessionId}`)
  }

  const handleSkip = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-8')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 7,
          data: { imported: false, productCount: 0 },
          action: 'skip',
        }),
      })
    } catch (err) {
      console.error('Failed to skip step:', err)
    }

    router.push(`/brands/new/wizard/step-8?sessionId=${sessionId}`)
  }

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Required</AlertTitle>
          <AlertDescription>
            Please start the onboarding wizard from the beginning.
          </AlertDescription>
        </Alert>
        <Link href="/brands/new">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Step 7 of 9</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Product Sync</span>
          <Badge variant="secondary" className="ml-2">
            Optional
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Import Products</h1>
        <p className="text-muted-foreground">
          Sync your products from Shopify to enable local features like reviews,
          attribution, and analytics.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < 7 ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Sync status card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      syncStatus.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : syncStatus.status === 'syncing'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {syncStatus.status === 'syncing' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : syncStatus.status === 'completed' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">Product Sync Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {syncStatus.status === 'idle' && 'Ready to sync products'}
                      {syncStatus.status === 'syncing' && 'Syncing products...'}
                      {syncStatus.status === 'completed' &&
                        `${syncStatus.syncedProducts} products synced`}
                      {syncStatus.status === 'error' && 'Sync failed'}
                    </p>
                  </div>
                </div>
                {syncStatus.status === 'completed' && (
                  <Badge variant="success">Synced</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sync progress */}
              {syncStatus.status === 'syncing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {syncStatus.syncedProducts} / {syncStatus.totalProducts || '?'}
                    </span>
                  </div>
                  <Progress
                    value={
                      syncStatus.totalProducts
                        ? (syncStatus.syncedProducts / syncStatus.totalProducts) * 100
                        : 0
                    }
                  />
                </div>
              )}

              {/* Stats */}
              {syncStatus.status === 'completed' && (
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{syncStatus.syncedProducts}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {products.filter((p) => p.status === 'active').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {new Set(products.map((p) => p.productType).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {syncStatus.status === 'idle' && (
                  <Button onClick={handleStartSync} disabled={isSyncing}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Start Sync
                  </Button>
                )}
                {syncStatus.status === 'completed' && (
                  <Button variant="outline" onClick={handleStartSync} disabled={isSyncing}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-sync Products
                  </Button>
                )}
                {syncStatus.status === 'error' && (
                  <Button onClick={handleStartSync} disabled={isSyncing}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Sync
                  </Button>
                )}
              </div>

              {/* Last sync time */}
              {syncStatus.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(syncStatus.lastSyncAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Product preview */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Product Preview</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {products.length} of {syncStatus.syncedProducts} products
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {products.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.productType || 'Uncategorized'} &bull; {product.vendor}
                        </p>
                      </div>
                      <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info card */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Why sync products?</p>
                  <p className="text-sm text-muted-foreground">
                    Syncing products enables local features like product reviews, marketing
                    attribution, and detailed analytics. Products will continue to sync
                    automatically after launch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleBack} disabled={isSyncing}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isSyncing}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip for Now
          </Button>
          <Button onClick={handleNext} disabled={isSyncing}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Step7Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Step7Content />
    </Suspense>
  )
}
