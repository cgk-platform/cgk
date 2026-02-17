export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { CustomerAddress, UpdateAddressRequest } from '@/lib/account/api'

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
 * PATCH /api/account/addresses/[id]
 * Updates an existing address
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: addressId } = await params
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Omit<UpdateAddressRequest, 'id'>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    // If setting as default, unset other defaults first
    if (body.isDefault) {
      await withTenant(tenantSlug, async () => {
        return sql`
          UPDATE customer_addresses
          SET is_default = false
          WHERE customer_id = ${session.customerId}
            AND is_default = true
            AND id != ${addressId}
        `
      })
    }

    const result = await withTenant(tenantSlug, async () => {
      return sql<AddressRow>`
        UPDATE customer_addresses
        SET
          first_name = COALESCE(${body.firstName ?? null}, first_name),
          last_name = COALESCE(${body.lastName ?? null}, last_name),
          company = CASE WHEN ${body.company !== undefined} THEN ${body.company ?? null} ELSE company END,
          address1 = COALESCE(${body.address1 ?? null}, address1),
          address2 = CASE WHEN ${body.address2 !== undefined} THEN ${body.address2 ?? null} ELSE address2 END,
          city = COALESCE(${body.city ?? null}, city),
          province = COALESCE(${body.province ?? null}, province),
          postal_code = COALESCE(${body.postalCode ?? null}, postal_code),
          country = COALESCE(${body.country ?? null}, country),
          country_code = COALESCE(${body.countryCode ?? null}, country_code),
          phone = CASE WHEN ${body.phone !== undefined} THEN ${body.phone ?? null} ELSE phone END,
          is_default = COALESCE(${body.isDefault ?? null}, is_default),
          updated_at = NOW()
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
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    return NextResponse.json(mapRowToAddress(address))
  } catch (error) {
    console.error('Failed to update address:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

/**
 * DELETE /api/account/addresses/[id]
 * Deletes an address
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
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
    // Check if this is the default address
    const addressResult = await withTenant(tenantSlug, async () => {
      return sql<{ is_default: boolean }>`
        SELECT is_default
        FROM customer_addresses
        WHERE id = ${addressId}
          AND customer_id = ${session.customerId}
        LIMIT 1
      `
    })

    const address = addressResult.rows[0]
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Delete the address
    await withTenant(tenantSlug, async () => {
      return sql`
        DELETE FROM customer_addresses
        WHERE id = ${addressId}
          AND customer_id = ${session.customerId}
      `
    })

    // If we deleted the default, set a new default
    if (address.is_default) {
      await withTenant(tenantSlug, async () => {
        return sql`
          UPDATE customer_addresses
          SET is_default = true
          WHERE customer_id = ${session.customerId}
            AND id = (
              SELECT id
              FROM customer_addresses
              WHERE customer_id = ${session.customerId}
              ORDER BY created_at ASC
              LIMIT 1
            )
        `
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete address:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
