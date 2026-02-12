import { withTenant } from '@cgk/db'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@cgk/ui'
import {
  Gift,
  CreditCard,
  Clock,
  AlertTriangle,
  Mail,
  Package,
  ChevronRight,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'

import { StatCard } from '@/components/admin/gift-cards/StatCard'
import {
  getTransactionStats,
  countActiveProducts,
  countPendingEmails,
  getGiftCardProducts,
  getGiftCardSettings,
} from '@/lib/gift-card'
import { formatMoney } from '@/lib/format'

export default function GiftCardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gift Cards & Store Credit</h1>
          <p className="text-muted-foreground">
            Manage gift card products, transactions, and email notifications
          </p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

async function DashboardContent() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const data = await withTenant(tenantSlug, async () => {
    const [stats, activeProductsCount, pendingEmailsCount, products, settings] =
      await Promise.all([
        getTransactionStats(),
        countActiveProducts(),
        countPendingEmails(),
        getGiftCardProducts('active'),
        getGiftCardSettings(),
      ])

    return { stats, activeProductsCount, pendingEmailsCount, products, settings }
  })

  const { stats, activeProductsCount, pendingEmailsCount, products, settings } = data

  return (
    <div className="space-y-6">
      {/* System Status */}
      {!settings.enabled && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Gift Card System Disabled</p>
                <p className="text-sm text-yellow-700">
                  Enable the gift card system in{' '}
                  <Link href="/admin/gift-cards/settings" className="underline">
                    settings
                  </Link>{' '}
                  to start processing rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Issued"
          value={formatMoney(stats.total_issued_cents)}
          subtitle={`${stats.transaction_count} transactions`}
          icon={Gift}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Credited"
          value={formatMoney(stats.total_credited_cents)}
          subtitle={`${stats.credited_count} credited`}
          icon={CreditCard}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Pending"
          value={formatMoney(stats.total_pending_cents)}
          subtitle={`${stats.pending_count} pending`}
          icon={Clock}
          iconColor="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Failed"
          value={formatMoney(stats.total_failed_cents)}
          subtitle={`${stats.failed_count} failed`}
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProductsCount}</div>
            <p className="text-xs text-muted-foreground">Active gift card products</p>
            <Link href="/admin/gift-cards/products">
              <Button variant="outline" size="sm" className="mt-4 w-full">
                Manage Products
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Queue</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEmailsCount}</div>
            <p className="text-xs text-muted-foreground">Pending email notifications</p>
            <Link href="/admin/gift-cards/emails">
              <Button variant="outline" size="sm" className="mt-4 w-full">
                View Email Queue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transaction_count}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
            <Link href="/admin/gift-cards/transactions">
              <Button variant="outline" size="sm" className="mt-4 w-full">
                View Transactions
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Products List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Gift Card Products</CardTitle>
          <Link href="/admin/gift-cards/products">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-medium">No active products</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sync gift card products from Shopify to get started.
              </p>
              <Link href="/admin/gift-cards/products">
                <Button className="mt-4">
                  <Package className="mr-2 h-4 w-4" />
                  Manage Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{product.title}</p>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(product.amount_cents)}</p>
                    {product.min_order_subtotal_cents > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Min: {formatMoney(product.min_order_subtotal_cents)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {products.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  And {products.length - 5} more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
