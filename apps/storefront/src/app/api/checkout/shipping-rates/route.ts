/**
 * Shipping Rates API Route
 *
 * POST /api/checkout/shipping-rates
 *
 * Fetches available shipping rates for a cart based on shipping address.
 * Rates are fetched from tenant configuration or computed dynamically.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withTenant, sql } from '@cgk-platform/db'

import { getTenantSlug, getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ShippingRatesRequest {
  cartId: string
  shippingAddress: {
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
  }
}

interface ShippingRate {
  id: string
  name: string
  price: number
  days: string
  description?: string
}

interface ShippingRateRow {
  id: string
  name: string
  price_cents: number
  min_days: number
  max_days: number
  description: string | null
  country_codes: string[] | null
}

interface CartRow {
  id: string
  subtotal_cents: number
}

/**
 * Default shipping rates when no tenant-specific rates are configured
 */
function getDefaultShippingRates(country: string): ShippingRate[] {
  // Domestic US rates
  if (country === 'US') {
    return [
      { id: 'standard', name: 'Standard Shipping', price: 5.99, days: '5-7 business days' },
      { id: 'express', name: 'Express Shipping', price: 14.99, days: '2-3 business days' },
      { id: 'overnight', name: 'Overnight Shipping', price: 29.99, days: '1 business day' },
    ]
  }

  // Canada rates
  if (country === 'CA') {
    return [
      { id: 'standard-ca', name: 'Standard Shipping', price: 9.99, days: '7-10 business days' },
      { id: 'express-ca', name: 'Express Shipping', price: 24.99, days: '3-5 business days' },
    ]
  }

  // International rates
  return [
    { id: 'international-standard', name: 'International Standard', price: 19.99, days: '10-20 business days' },
    { id: 'international-express', name: 'International Express', price: 49.99, days: '5-10 business days' },
  ]
}

/**
 * Check if cart qualifies for free shipping
 */
async function checkFreeShippingThreshold(
  tenantSlug: string,
  subtotalCents: number
): Promise<{ qualifies: boolean; threshold: number | null }> {
  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<{ free_shipping_threshold_cents: number | null }>`
        SELECT free_shipping_threshold_cents
        FROM tenant_settings
        WHERE id = 'default'
        LIMIT 1
      `
    })

    const settings = result.rows[0]
    const threshold = settings?.free_shipping_threshold_cents

    if (threshold && subtotalCents >= threshold) {
      return { qualifies: true, threshold: threshold / 100 }
    }

    return { qualifies: false, threshold: threshold ? threshold / 100 : null }
  } catch {
    // If settings table doesn't exist or query fails, no free shipping
    return { qualifies: false, threshold: null }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const tenantSlug = await getTenantSlug()
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as ShippingRatesRequest
    const { cartId, shippingAddress } = body

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      )
    }

    if (!shippingAddress?.country || !shippingAddress?.zip) {
      return NextResponse.json(
        { error: 'Shipping address with country and zip is required' },
        { status: 400 }
      )
    }

    const { country } = shippingAddress

    // Get cart subtotal for free shipping check
    let subtotalCents = 0
    try {
      const cartResult = await withTenant(tenantSlug, async () => {
        return sql<CartRow>`
          SELECT id, subtotal_cents
          FROM carts
          WHERE id = ${cartId}
            AND (expires_at IS NULL OR expires_at > NOW())
        `
      })
      subtotalCents = cartResult.rows[0]?.subtotal_cents ?? 0
    } catch {
      // Cart table may not exist, continue with default rates
      console.warn('[shipping-rates] Could not fetch cart data')
    }

    // Try to get tenant-configured shipping rates
    let rates: ShippingRate[] = []
    try {
      const ratesResult = await withTenant(tenantSlug, async () => {
        return sql<ShippingRateRow>`
          SELECT
            id,
            name,
            price_cents,
            min_days,
            max_days,
            description,
            country_codes
          FROM shipping_rates
          WHERE active = true
            AND (
              country_codes IS NULL
              OR ${country} = ANY(country_codes)
            )
          ORDER BY price_cents ASC
        `
      })

      if (ratesResult.rows.length > 0) {
        rates = ratesResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          price: row.price_cents / 100,
          days: row.min_days === row.max_days
            ? `${row.min_days} business day${row.min_days === 1 ? '' : 's'}`
            : `${row.min_days}-${row.max_days} business days`,
          description: row.description ?? undefined,
        }))
      }
    } catch {
      // Shipping rates table doesn't exist, use defaults
      console.debug('[shipping-rates] Using default rates (table not found)')
    }

    // Fall back to default rates if none configured
    if (rates.length === 0) {
      rates = getDefaultShippingRates(country)
    }

    // Check for free shipping threshold
    const freeShipping = await checkFreeShippingThreshold(tenantSlug, subtotalCents)

    if (freeShipping.qualifies) {
      // Add free shipping option at the top
      rates = [
        {
          id: 'free-shipping',
          name: 'Free Standard Shipping',
          price: 0,
          days: '5-7 business days',
          description: 'You qualify for free shipping!',
        },
        ...rates.filter((r) => r.price > 0),
      ]
    }

    // Get tenant config for any additional customization
    const tenantConfig = await getTenantConfig()
    const currencyCode = tenantConfig?.settings.commerce?.currencyCode ?? 'USD'

    return NextResponse.json({
      rates,
      currency: currencyCode,
      freeShippingThreshold: freeShipping.threshold,
      qualifiesForFreeShipping: freeShipping.qualifies,
      cartSubtotal: subtotalCents / 100,
    })
  } catch (error) {
    console.error('[shipping-rates] Error:', error)

    // Return fallback rates on error
    return NextResponse.json({
      rates: getDefaultShippingRates('US'),
      currency: 'USD',
      freeShippingThreshold: null,
      qualifiesForFreeShipping: false,
      error: 'Failed to load custom rates, showing default options',
    })
  }
}
