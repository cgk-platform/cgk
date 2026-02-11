export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTreasurySummary, getBalanceHistory, getLowBalanceAlerts } from '@/lib/treasury/db'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeHistory = url.searchParams.get('history') === 'true'
  const historyDays = parseInt(url.searchParams.get('days') || '30', 10)

  const [summary, alerts] = await Promise.all([
    getTreasurySummary(tenantSlug),
    getLowBalanceAlerts(tenantSlug),
  ])

  const response: {
    summary: typeof summary
    alerts: typeof alerts
    history?: Awaited<ReturnType<typeof getBalanceHistory>>
  } = {
    summary,
    alerts,
  }

  if (includeHistory) {
    response.history = await getBalanceHistory(tenantSlug, historyDays)
  }

  return NextResponse.json(response)
}
