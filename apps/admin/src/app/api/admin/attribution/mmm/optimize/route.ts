export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { optimizeBudget } from '@/lib/attribution'

interface OptimizeRequest {
  totalBudget: number
  constraints?: Record<string, { min?: number; max?: number }>
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = (await request.json()) as OptimizeRequest
  const { totalBudget, constraints } = body

  if (!totalBudget || totalBudget <= 0) {
    return NextResponse.json({ error: 'Valid total budget is required' }, { status: 400 })
  }

  const result = await withTenant(tenantSlug, () =>
    optimizeBudget(tenantId, totalBudget, constraints)
  )

  if (!result) {
    return NextResponse.json(
      { error: 'No MMM model available. Please run MMM training first.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ optimization: result })
}
