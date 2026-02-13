export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createMMMModel, updateMMMModelStatus } from '@/lib/attribution'

interface RunMMMRequest {
  channels: string[]
  dateRangeStart: string
  dateRangeEnd: string
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = (await request.json()) as RunMMMRequest
  const { channels, dateRangeStart, dateRangeEnd } = body

  if (!channels || channels.length === 0) {
    return NextResponse.json({ error: 'At least one channel is required' }, { status: 400 })
  }

  if (!dateRangeStart || !dateRangeEnd) {
    return NextResponse.json({ error: 'Date range is required' }, { status: 400 })
  }

  const model = await withTenant(tenantSlug, () =>
    createMMMModel(tenantId, channels, dateRangeStart, dateRangeEnd)
  )

  // Mark as running (in a real implementation, this would trigger a background job)
  await withTenant(tenantSlug, () => updateMMMModelStatus(model.id, 'running'))

  // Simulate model training completion with mock results
  // In production, this would be handled by a background job (PHASE-5D)
  setTimeout(async () => {
    const mockModelFit = {
      r2: 0.85 + Math.random() * 0.1,
      mape: 0.08 + Math.random() * 0.04,
      bayesianR2: 0.82 + Math.random() * 0.1,
    }

    const mockResults = {
      modelId: model.id,
      status: 'completed' as const,
      lastRunAt: new Date().toISOString(),
      modelFit: mockModelFit,
      channels: channels.map((channel) => {
        const currentSpend = 5000 + Math.random() * 15000
        const currentRoi = 1.5 + Math.random() * 3
        const marginalRoi = currentRoi * (0.6 + Math.random() * 0.4)
        return {
          channel,
          contributionPercent: 100 / channels.length,
          currentRoi,
          marginalRoi,
          saturationPoint: currentSpend * (1.5 + Math.random()),
          optimalSpend: currentSpend * (0.8 + Math.random() * 0.6),
          currentSpend,
        }
      }),
      saturationCurves: channels.map((channel) => ({
        channel,
        curve: Array.from({ length: 20 }, (_, i) => {
          const spend = i * 2000
          const maxRevenue = 50000 + Math.random() * 30000
          const saturationRate = 0.0001 + Math.random() * 0.0001
          const revenue = maxRevenue * (1 - Math.exp(-saturationRate * spend))
          return { spend, revenue: Math.round(revenue) }
        }),
      })),
    }

    await withTenant(tenantSlug, () =>
      updateMMMModelStatus(model.id, 'completed', mockModelFit, mockResults)
    )
  }, 5000) // Simulate 5 second training time

  return NextResponse.json({
    model: { ...model, status: 'running' },
    message: 'MMM training started. Results will be available shortly.',
  })
}
