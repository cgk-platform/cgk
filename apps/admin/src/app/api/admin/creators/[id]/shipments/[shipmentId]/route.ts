export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getShipmentById, updateShipmentStatus } from '@/lib/creators/lifecycle-db'
import type { ShipmentStatus } from '@/lib/creators/lifecycle-types'

const VALID_STATUSES: ShipmentStatus[] = ['pending', 'ordered', 'shipped', 'delivered', 'failed']
const VALID_CARRIERS = ['ups', 'fedex', 'usps', 'dhl']

/**
 * GET /api/admin/creators/[id]/shipments/[shipmentId]
 * Returns a single shipment
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; shipmentId: string }> }
) {
  const { shipmentId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const shipment = await getShipmentById(tenantSlug, shipmentId)

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    return NextResponse.json({ shipment })
  } catch (error) {
    console.error('[shipments/[shipmentId]] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch shipment' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/creators/[id]/shipments/[shipmentId]
 * Updates shipment status and tracking info
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; shipmentId: string }> }
) {
  const { shipmentId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    status?: string
    trackingNumber?: string
    carrier?: string
    notes?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate status if provided
  if (body.status && !VALID_STATUSES.includes(body.status as ShipmentStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate carrier if provided
  if (body.carrier && !VALID_CARRIERS.includes(body.carrier.toLowerCase())) {
    return NextResponse.json(
      { error: `Invalid carrier. Must be one of: ${VALID_CARRIERS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const shipment = await updateShipmentStatus(tenantSlug, shipmentId, {
      status: body.status as ShipmentStatus | undefined,
      trackingNumber: body.trackingNumber,
      carrier: body.carrier?.toLowerCase(),
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, shipment })
  } catch (error) {
    console.error('[shipments/[shipmentId]] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
  }
}
