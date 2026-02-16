export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { createMMMModel } from '@/lib/attribution'

interface RunMMMRequest {
  channels: string[]
  dateRangeStart: string
  dateRangeEnd: string
}

/**
 * Check if ML service is configured for the tenant
 * MMM requires external ML infrastructure (e.g., AWS SageMaker, GCP Vertex AI)
 */
async function isMLServiceConfigured(_tenantId: string): Promise<boolean> {
  // ML service configuration would be stored in tenant settings
  // For now, this feature requires external ML infrastructure to be set up
  // Return false until ML service integration is implemented
  return false
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

  // Check if ML service is configured
  const mlConfigured = await isMLServiceConfigured(tenantId)

  if (!mlConfigured) {
    return NextResponse.json(
      {
        error: 'Marketing Mix Modeling is not available',
        details:
          'MMM requires ML infrastructure (AWS SageMaker or GCP Vertex AI) to be configured. ' +
          'Please contact support to enable this feature for your account.',
        code: 'ML_SERVICE_NOT_CONFIGURED',
      },
      { status: 503 }
    )
  }

  // Create model record (stays in draft until ML service processes it)
  const model = await withTenant(tenantSlug, () =>
    createMMMModel(tenantId, channels, dateRangeStart, dateRangeEnd)
  )

  // In production, this would:
  // 1. Mark as 'running' when ML service starts training
  // 2. ML service would call back via webhook when training completes
  // 3. Webhook handler would update model status with results

  return NextResponse.json({
    model: { ...model, status: 'draft' },
    message:
      'MMM training request created. It will be processed when ML service is available.',
  })
}
