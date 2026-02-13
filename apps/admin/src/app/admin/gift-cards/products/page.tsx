import { withTenant } from '@cgk-platform/db'
import { Card, CardContent, Button } from '@cgk-platform/ui'
import { Gift, RefreshCw, Archive, Check } from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { ProductStatusBadge } from '@/components/admin/gift-cards/status-badge'
import { getGiftCardProducts } from '@/lib/gift-card'
import { formatMoney, formatDateTime } from '@/lib/format'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Card Products</h1>
          <p className="text-muted-foreground">
            Manage gift card products synced from Shopify
          </p>
        </div>
        <div className="flex gap-2">
          <SyncButton />
        </div>
      </div>

      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsList />
      </Suspense>
    </div>
  )
}

function SyncButton() {
  return (
    <form action="/api/admin/gift-cards/products/sync" method="POST">
      <Button type="submit" variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Sync from Shopify
      </Button>
    </form>
  )
}

async function ProductsList() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const products = await withTenant(tenantSlug, async () => {
    return getGiftCardProducts()
  })

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No gift card products</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sync gift card products from Shopify or create them manually.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Gift card products should have product type &quot;gift_card&quot; or tag
              &quot;gift-card&quot; in Shopify.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                  <Gift className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{product.title}</h3>
                  <ProductStatusBadge status={product.status} />
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  <span>Variant: {product.variant_id_numeric}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last synced: {formatDateTime(product.synced_at)}
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold">{formatMoney(product.amount_cents)}</p>
                {product.min_order_subtotal_cents > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Min order: {formatMoney(product.min_order_subtotal_cents)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <ProductActionButton product={product} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ProductActionButton({
  product,
}: {
  product: { id: string; status: string }
}) {
  const action = product.status === 'active' ? 'archive' : 'activate'
  const Icon = product.status === 'active' ? Archive : Check

  return (
    <form
      action={`/api/admin/gift-cards/products`}
      method="POST"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        await fetch(form.action, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: product.id, action }),
        })
        window.location.reload()
      }}
    >
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant="outline" size="sm">
        <Icon className="mr-2 h-4 w-4" />
        {product.status === 'active' ? 'Archive' : 'Activate'}
      </Button>
    </form>
  )
}

function ProductsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
