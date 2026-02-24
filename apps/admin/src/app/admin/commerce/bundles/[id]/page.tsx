import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, StatusBadge, cn } from '@cgk-platform/ui'
import { getBundle, getBundleOrderStats } from '@/lib/bundles/db'
import { getShopifyConnection } from '@cgk-platform/shopify'
import { formatDateTime, formatMoney } from '@/lib/format'

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const [bundle, shopifyConnection] = await Promise.all([
    getBundle(tenantSlug, id),
    getShopifyConnection(tenantSlug).catch(() => null),
  ])
  if (!bundle) notFound()

  const stats = await getBundleOrderStats(tenantSlug, id)

  const hasColors = bundle.bgColor || bundle.textColor || bundle.accentColor
  const shopDomain = shopifyConnection?.shop ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/commerce/bundles" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{bundle.name}</h1>
            <StatusBadge status={bundle.status} />
          </div>
          {bundle.headline && (
            <p className="text-sm text-muted-foreground">{bundle.headline}</p>
          )}
          {bundle.description && !bundle.headline && (
            <p className="text-sm text-muted-foreground">{bundle.description}</p>
          )}
        </div>
        {shopDomain && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://${shopDomain}/admin/discounts`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Shopify
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Discount Type</dt>
                  <dd className="mt-1 text-sm">
                    {bundle.discountType === 'percentage' ? 'Percentage' : 'Fixed amount'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Item Range</dt>
                  <dd className="mt-1 text-sm">
                    {bundle.minItems} - {bundle.maxItems} items
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Layout</dt>
                  <dd className="mt-1 text-sm">
                    {bundle.layout === 'grid' ? 'Grid' : 'List'}
                    {bundle.layout === 'grid' && ` (${bundle.columnsDesktop} columns)`}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Image Ratio</dt>
                  <dd className="mt-1 text-sm capitalize">{bundle.imageRatio}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">CTA Text</dt>
                  <dd className="mt-1 text-sm">{bundle.ctaText}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Features</dt>
                  <dd className="mt-1 space-y-1 text-sm">
                    {bundle.showSavings && <div>Show savings</div>}
                    {bundle.showTierProgress && <div>Show tier progress</div>}
                    {bundle.enableQuantity && <div>Enable quantity selector</div>}
                    {!bundle.showSavings && !bundle.showTierProgress && !bundle.enableQuantity && (
                      <span className="text-muted-foreground">None enabled</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tier Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {bundle.tiers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Threshold</th>
                        <th className="pb-2 font-medium">Discount</th>
                        <th className="pb-2 font-medium">Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bundle.tiers.map((tier, i) => (
                        <tr key={i}>
                          <td className="py-2">{tier.count}+ items</td>
                          <td className="py-2">
                            {bundle.discountType === 'percentage'
                              ? `${tier.discount}% off`
                              : `${formatMoney(tier.discount)} off`}
                          </td>
                          <td className="py-2">{tier.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tier rules configured</p>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <div className={cn(
                  'rounded-lg p-4',
                  'ring-1 ring-gold/20 bg-gradient-to-br from-gold/5 to-transparent',
                )}>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="mt-1 text-2xl font-bold">{formatMoney(stats.totalRevenue)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Discounts Given</p>
                  <p className="mt-1 text-2xl font-bold">{formatMoney(stats.totalDiscount)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Items Per Order</p>
                  <p className="mt-1 text-2xl font-bold">{stats.avgOrderSize.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          {bundle.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bundle Items ({bundle.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bundle.items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2 text-muted-foreground">{item.position}</td>
                          <td className="py-2">{item.title}</td>
                          <td className="py-2 text-right">{formatMoney(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDateTime(bundle.createdAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd>{formatDateTime(bundle.updatedAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created by</dt>
                  <dd>{bundle.createdBy ?? 'System'}</dd>
                </div>
                {bundle.shopifySectionId && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Shopify Section ID</dt>
                    <dd className="flex items-center gap-1 truncate font-mono text-xs">
                      {bundle.shopifySectionId}
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Visual Settings */}
          {hasColors && (
            <Card>
              <CardHeader>
                <CardTitle>Visual Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {bundle.bgColor && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Background</dt>
                      <dd className="flex items-center gap-2">
                        <span
                          className="inline-block h-5 w-5 rounded border border-border"
                          style={{ backgroundColor: bundle.bgColor }}
                        />
                        <span className="font-mono text-xs">{bundle.bgColor}</span>
                      </dd>
                    </div>
                  )}
                  {bundle.textColor && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Text</dt>
                      <dd className="flex items-center gap-2">
                        <span
                          className="inline-block h-5 w-5 rounded border border-border"
                          style={{ backgroundColor: bundle.textColor }}
                        />
                        <span className="font-mono text-xs">{bundle.textColor}</span>
                      </dd>
                    </div>
                  )}
                  {bundle.accentColor && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Accent</dt>
                      <dd className="flex items-center gap-2">
                        <span
                          className="inline-block h-5 w-5 rounded border border-border"
                          style={{ backgroundColor: bundle.accentColor }}
                        />
                        <span className="font-mono text-xs">{bundle.accentColor}</span>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
