export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  createIncrementalityExperiment,
  getIncrementalityExperiments,
} from '@/lib/attribution'
import type { CreateExperimentRequest } from '@/lib/attribution'

export async function GET(_request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const experiments = await withTenant(tenantSlug, () =>
    getIncrementalityExperiments(tenantId)
  )

  return NextResponse.json({ experiments })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = (await request.json()) as CreateExperimentRequest

  if (!body.name || !body.platform) {
    return NextResponse.json({ error: 'Name and platform are required' }, { status: 400 })
  }

  if (!body.testRegions || body.testRegions.length === 0) {
    return NextResponse.json({ error: 'At least one test region is required' }, { status: 400 })
  }

  if (!body.controlRegions || body.controlRegions.length === 0) {
    return NextResponse.json({ error: 'At least one control region is required' }, { status: 400 })
  }

  if (!body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
  }

  const experiment = await withTenant(tenantSlug, () =>
    createIncrementalityExperiment(tenantId, body)
  )

  return NextResponse.json({ experiment }, { status: 201 })
}
