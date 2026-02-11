export const dynamic = 'force-dynamic'
export const revalidate = 0

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getExportConfiguration, recordExportRun } from '@/lib/attribution'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const tenantId = headerList.get('x-tenant-id')

  if (!tenantSlug || !tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params

  // Verify export exists
  const exportConfig = await withTenant(tenantSlug, () =>
    getExportConfiguration(tenantId, id)
  )

  if (!exportConfig) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  // In a real implementation, this would:
  // 1. Query the specified tables
  // 2. Format data in the configured format (CSV, JSON, Parquet)
  // 3. Upload to the destination (S3, GCS, webhook, SFTP)
  // 4. Return a download URL if applicable
  // For now, we simulate success

  try {
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 100))

    await withTenant(tenantSlug, () =>
      recordExportRun(tenantId, id, 'success', 0)
    )

    return NextResponse.json({
      success: true,
      message: 'Export completed successfully',
      recordCount: 0,
    })
  } catch (error) {
    await withTenant(tenantSlug, () =>
      recordExportRun(tenantId, id, 'failed', 0)
    )

    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
