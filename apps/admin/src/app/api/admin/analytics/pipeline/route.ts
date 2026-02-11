/**
 * Pipeline Analytics API
 *
 * GET /api/admin/analytics/pipeline
 * Returns sales funnel and pipeline metrics
 */

import { getTenantContext } from '@cgk/auth'

import { getPipelineData } from '@/lib/analytics'
import type { DateRange } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const preset = url.searchParams.get('preset') || '30d'
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const source = url.searchParams.get('source') || undefined

  const dateRange: DateRange = {
    preset: preset as DateRange['preset'],
    startDate: startDate ?? getDefaultStartDate(preset),
    endDate: endDate ?? new Date().toISOString().split('T')[0] ?? '',
  }

  const data = await getPipelineData(tenantId, dateRange, source)

  return Response.json({ data })
}

function getDefaultStartDate(preset: string): string {
  const now = new Date()
  const days = {
    '7d': 7,
    '14d': 14,
    '28d': 28,
    '30d': 30,
    '90d': 90,
  }[preset] || 30

  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return start.toISOString().split('T')[0] ?? ''
}
