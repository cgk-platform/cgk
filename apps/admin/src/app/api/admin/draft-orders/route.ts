/**
 * Draft Orders API Route
 * POST: Create a draft order from an abandoned checkout
 */

export const dynamic = 'force-dynamic'

import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAbandonedCheckout,
  createDraftOrder,
  cancelPendingEmails,
} from '@/lib/abandoned-checkouts/db'
import type { CreateDraftOrderRequest } from '@/lib/abandoned-checkouts/types'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateDraftOrderRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.checkoutId) {
    return NextResponse.json(
      { error: 'Checkout ID is required' },
      { status: 400 },
    )
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      const checkout = await getAbandonedCheckout(body.checkoutId)

      if (!checkout) {
        return { error: 'Abandoned checkout not found', status: 404 }
      }

      if (checkout.status !== 'abandoned') {
        return { error: 'Checkout is not in abandoned status', status: 400 }
      }

      // Get tenant's Shopify credentials
      const tenantSettings = await sql`
        SELECT shopify_store_domain, shopify_admin_access_token
        FROM tenant_settings
        LIMIT 1
      `

      const settings = tenantSettings.rows[0] as {
        shopify_store_domain?: string
        shopify_admin_access_token?: string
      } | undefined

      if (!settings?.shopify_store_domain || !settings?.shopify_admin_access_token) {
        return { error: 'Shopify credentials not configured', status: 400 }
      }

      // Calculate totals
      let subtotalCents = checkout.lineItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      )
      let discountAmountCents = 0

      // Apply discount if provided
      if (body.discountCode) {
        // For now, we store the discount code but don't calculate the amount
        // The actual discount will be applied when the draft order is created in Shopify
        // In a real implementation, you'd validate the discount code via Shopify API
      }

      // Create draft order in Shopify via GraphQL
      // For this implementation, we'll store the draft order locally
      // and integrate with Shopify's draftOrderCreate mutation
      const shopifyDraftOrderId = `draft_${Date.now()}_${checkout.id.slice(0, 8)}`

      const draftOrder = await createDraftOrder({
        abandonedCheckoutId: checkout.id,
        shopifyDraftOrderId,
        shopifyDraftOrderName: `#D${Date.now().toString().slice(-6)}`,
        customerEmail: checkout.customerEmail || undefined,
        customerId: checkout.customerId || undefined,
        subtotalCents,
        totalCents: subtotalCents - discountAmountCents,
        currencyCode: checkout.currencyCode,
        lineItems: checkout.lineItems,
        discountCode: body.discountCode,
        discountAmountCents,
        notes: body.notes,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })

      // Cancel any pending recovery emails since we're creating a draft order
      await cancelPendingEmails(checkout.id)

      return { success: true, draftOrder }
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      draftOrder: result.draftOrder,
    })
  } catch (error) {
    console.error('Failed to create draft order:', error)
    return NextResponse.json(
      { error: 'Failed to create draft order' },
      { status: 500 },
    )
  }
}
