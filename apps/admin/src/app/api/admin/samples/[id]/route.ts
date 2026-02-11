export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  updateSampleRequest,
  deleteSampleRequest,
} from '@/lib/creators-admin-ops'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      status,
      trackingCarrier,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
      actualDelivery,
      notes,
      internalNotes,
      costCents,
    } = body as {
      status?: string
      trackingCarrier?: string
      trackingNumber?: string
      trackingUrl?: string
      estimatedDelivery?: string
      actualDelivery?: string
      notes?: string
      internalNotes?: string
      costCents?: number
    }

    const sampleRequest = await updateSampleRequest(tenantSlug, id, {
      status,
      trackingCarrier,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
      actualDelivery,
      notes,
      internalNotes,
      costCents,
    })

    return NextResponse.json({ success: true, request: sampleRequest })
  } catch (error) {
    console.error('Error updating sample request:', error)
    return NextResponse.json(
      { error: 'Failed to update sample request' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const { id } = await params
    const deleted = await deleteSampleRequest(tenantSlug, id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Sample request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sample request:', error)
    return NextResponse.json(
      { error: 'Failed to delete sample request' },
      { status: 500 }
    )
  }
}
