export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { CustomerAddress } from '@/lib/account/api'

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

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/account/addresses/[id]/default
 * Sets an address as the default
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: addressId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify address belongs to customer
    const checkResult = await withTenant(tenantSlug, async () => {
      return sql<{ id: string }>`
        SELECT id
        FROM customer_addresses
        WHERE id = ${addressId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    if (!checkResult.rows[0]) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Unset all other defaults
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE customer_addresses
        SET is_default = false
        WHERE customer_id = ${session.customerId}
          AND is_default = true
      `
    })

    // Set this address as default
    const result = await withTenant(tenantSlug, async () => {
      return sql<AddressRow>`
        UPDATE customer_addresses
        SET is_default = true, updated_at = NOW()
        WHERE id = ${addressId}
          AND customer_id = ${session.customerId}
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
      return NextResponse.json({ error: 'Failed to set default address' }, { status: 500 })
    }

    return NextResponse.json(mapRowToAddress(address))
  } catch (error) {
    console.error('Failed to set default address:', error)
    return NextResponse.json({ error: 'Failed to set default address' }, { status: 500 })
  }
}
