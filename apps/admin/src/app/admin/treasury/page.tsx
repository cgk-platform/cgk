import { Card, CardContent, CardHeader } from '@cgk/ui'
import { AlertTriangle } from 'lucide-react'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { formatMoney, formatDateTime } from '@/lib/format'
import { getTreasurySummary, getLowBalanceAlerts } from '@/lib/treasury/db'

export default async function TreasuryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Treasury</h1>

      <Suspense fallback={<TreasurySkeleton />}>
        <TreasuryLoader />
      </Suspense>
    </div>
  )
}

async function TreasuryLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  if (!tenantSlug) return <p className="text-muted-foreground">No tenant configured.</p>

  const [summary, alerts] = await Promise.all([
    getTreasurySummary(tenantSlug),
    getLowBalanceAlerts(tenantSlug),
  ])

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <h3 className="font-semibold">Low Balance Alerts</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {alerts.map((alert) => (
                    <li key={alert.provider}>
                      <span className="capitalize font-medium">{alert.provider}</span> balance is{' '}
                      {formatMoney(Number(alert.current_cents))} (threshold:{' '}
                      {formatMoney(Number(alert.threshold_cents))})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(summary.total_available_cents)}
            </div>
            <div className="text-sm text-muted-foreground">Total Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatMoney(summary.total_pending_cents)}
            </div>
            <div className="text-sm text-muted-foreground">Pending (in transit)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {formatMoney(summary.pending_payouts_cents)}
            </div>
            <div className="text-sm text-muted-foreground">Pending Payouts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatMoney(summary.net_available_cents)}
            </div>
            <div className="text-sm text-muted-foreground">Net Available</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Balances by Provider</h3>
        </CardHeader>
        <CardContent>
          {summary.balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment providers configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Available
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Pending
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Currency
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.balances.map((balance) => (
                    <tr key={balance.provider} className="hover:bg-muted/50">
                      <td className="px-4 py-3 capitalize font-medium">{balance.provider}</td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatMoney(Number(balance.available_cents), balance.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(Number(balance.pending_cents), balance.currency)}
                      </td>
                      <td className="px-4 py-3">{balance.currency}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(balance.last_updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TreasurySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
