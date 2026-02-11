export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { bulkUpdateSampleStatus } from '@/lib/creators-admin-ops'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { requestIds, status, trackingInfo } = body as {
      requestIds: string[]
      status: string
      trackingInfo?: {
        carrier?: string
        number?: string
        url?: string
      }
    }

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'requestIds array is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    const updated = await bulkUpdateSampleStatus(
      tenantSlug,
      requestIds,
      status,
      trackingInfo
    )

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Error updating sample statuses:', error)
    return NextResponse.json(
      { error: 'Failed to update sample statuses' },
      { status: 500 }
    )
  }
}
