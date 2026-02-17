export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { CustomerAddress, CreateAddressRequest } from '@/lib/account/api'

interface AddressRow {
  id: string
  first_name: string
  last_name: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  province: string
  province_code: string | null
  postal_code: string
  country: string
  country_code: string
  phone: string | null
  is_default: boolean
}

function mapRowToAddress(row: AddressRow): CustomerAddress {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company,
    address1: row.address1,
    address2: row.address2,
    city: row.city,
    province: row.province,
    provinceCode: row.province_code,
    postalCode: row.postal_code,
    country: row.country,
    countryCode: row.country_code,
    phone: row.phone,
    isDefault: row.is_default,
  }
}

/**
 * GET /api/account/addresses
 * Returns the customer's saved addresses
 */
export async function GET() {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      return sql<AddressRow>`
        SELECT
          id,
          first_name,
          last_name,
          company,
          address1,
          address2,
          city,
          province,
          province_code,
          postal_code,
          country,
          country_code,
          phone,
          is_default
        FROM customer_addresses
        WHERE customer_id = ${session.customerId}
        ORDER BY is_default DESC, created_at DESC
      `
    })

    const addresses = result.rows.map(mapRowToAddress)
    return NextResponse.json(addresses)
  } catch {
    // Table might not exist - return addresses from customer's default_address
    const customerResult = await withTenant(tenantSlug, async () => {
      return sql<{ default_address: Record<string, unknown> | null }>`
        SELECT default_address
        FROM customers
        WHERE id = ${session.customerId}
        LIMIT 1
      `
    })

    const customer = customerResult.rows[0]
    if (customer?.default_address) {
      const addr = customer.default_address
      const address: CustomerAddress = {
        id: 'default',
        firstName: String(addr.first_name ?? ''),
        lastName: String(addr.last_name ?? ''),
        company: addr.company as string | null,
        address1: String(addr.address1 ?? ''),
        address2: addr.address2 as string | null,
        city: String(addr.city ?? ''),
        province: String(addr.province ?? ''),
        provinceCode: addr.province_code as string | null,
        postalCode: String(addr.zip ?? addr.postal_code ?? ''),
        country: String(addr.country ?? ''),
        countryCode: String(addr.country_code ?? ''),
        phone: addr.phone as string | null,
        isDefault: true,
      }
      return NextResponse.json([address])
    }

    return NextResponse.json([])
  }
}

/**
 * POST /api/account/addresses
 * Creates a new address for the customer
 */
export async function POST(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateAddressRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!body.firstName || !body.lastName || !body.address1 || !body.city || !body.province || !body.postalCode || !body.country || !body.countryCode) {
    return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 })
  }

  const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  try {
    // If this is marked as default, unset other defaults first
    if (body.isDefault) {
      await withTenant(tenantSlug, async () => {
        return sql`
          UPDATE customer_addresses
          SET is_default = false
          WHERE customer_id = ${session.customerId}
            AND is_default = true
        `
      })
    }

    // Check if this is the first address (should be default)
    const countResult = await withTenant(tenantSlug, async () => {
      return sql<{ count: string }>`
        SELECT COUNT(*) as count
        FROM customer_addresses
        WHERE customer_id = ${session.customerId}
      `
    })
    const isFirstAddress = parseInt(countResult.rows[0]?.count ?? '0', 10) === 0
    const shouldBeDefault = body.isDefault || isFirstAddress

    const result = await withTenant(tenantSlug, async () => {
      return sql<AddressRow>`
        INSERT INTO customer_addresses (
          id,
          customer_id,
          first_name,
          last_name,
          company,
          address1,
          address2,
          city,
          province,
          province_code,
          postal_code,
          country,
          country_code,
          phone,
          is_default,
          created_at,
          updated_at
        ) VALUES (
          ${addressId},
          ${session.customerId},
          ${body.firstName},
          ${body.lastName},
          ${body.company ?? null},
          ${body.address1},
          ${body.address2 ?? null},
          ${body.city},
          ${body.province},
          ${null},
          ${body.postalCode},
          ${body.country},
          ${body.countryCode},
          ${body.phone ?? null},
          ${shouldBeDefault},
          NOW(),
          NOW()
        )
        RETURNING
          id,
          first_name,
          last_name,
          company,
          address1,
          address2,
          city,
          province,
          province_code,
          postal_code,
          country,
          country_code,
          phone,
          is_default
      `
    })

    const address = result.rows[0]
    if (!address) {
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
    }

    return NextResponse.json(mapRowToAddress(address))
  } catch (error) {
    console.error('Failed to create address:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}
