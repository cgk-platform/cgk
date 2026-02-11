export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  deleteIncrementalityExperiment,
  getExperimentPerformanceData,
  getIncrementalityExperiment,
  updateIncrementalityExperiment,
} from '@/lib/attribution'
import type { CreateExperimentRequest, IncrementalityExperiment } from '@/lib/attribution'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const experiment = await withTenant(tenantSlug, () =>
    getIncrementalityExperiment(tenantId, id)
  )

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const performanceData = await withTenant(tenantSlug, () =>
    getExperimentPerformanceData(tenantId, id)
  )

  return NextResponse.json({ experiment, performanceData })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const body = (await request.json()) as Partial<CreateExperimentRequest> & {
    status?: IncrementalityExperiment['status']
  }

  const experiment = await withTenant(tenantSlug, () =>
    updateIncrementalityExperiment(tenantId, id, body)
  )

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  return NextResponse.json({ experiment })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  const deleted = await withTenant(tenantSlug, () =>
    deleteIncrementalityExperiment(tenantId, id)
  )

  if (!deleted) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
