export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getShipmentById } from '../../../../../../../../lib/creators/lifecycle-db'

/**
 * POST /api/admin/creators/[id]/shipments/[shipmentId]/sync
 * Syncs shipment status from Shopify fulfillment data
 *
 * In a full implementation, this would:
 * 1. Fetch the order from Shopify using shopifyOrderId
 * 2. Get fulfillment status and tracking info
 * 3. Update the shipment record accordingly
 */
export async function POST(
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

    if (!shipment.shopifyOrderId) {
      return NextResponse.json(
        { error: 'Shipment has no Shopify order to sync' },
        { status: 400 }
      )
    }

    // In a full implementation, this would call Shopify API:
    // const order = await shopifyClient.order.get(shipment.shopifyOrderId)
    // const fulfillment = order.fulfillments[0]
    // if (fulfillment) {
    //   Update status based on fulfillment.status
    //   Update tracking from fulfillment.tracking_number
    //   Update carrier from fulfillment.tracking_company
    // }

    // For now, return the current shipment without changes
    // A background job (syncCreatorShipments) handles periodic syncing

    return NextResponse.json({
      success: true,
      shipment,
      message: 'Sync complete (simulated)',
    })
  } catch (error) {
    console.error('[shipments/[shipmentId]/sync] POST error:', error)
    return NextResponse.json({ error: 'Failed to sync shipment' }, { status: 500 })
  }
}
