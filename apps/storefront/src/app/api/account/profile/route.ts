export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { sql, withTenant } from '@cgk-platform/db'
import { getCustomerSession } from '@/lib/customer-session'
import { getTenantSlug } from '@/lib/tenant'

import type { CustomerProfile, UpdateProfileRequest } from '@/lib/account/types'

/**
 * GET /api/account/profile
 * Returns the current customer's profile
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

  const result = await withTenant(tenantSlug, async () => {
    return sql<{
      id: string
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      accepts_marketing: boolean
      created_at: string
      updated_at: string
    }>`
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        COALESCE(accepts_marketing, false) as accepts_marketing,
        created_at,
        updated_at
      FROM customers
      WHERE id = ${session.customerId}
      LIMIT 1
    `
  })

  const customer = result.rows[0]
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const profile: CustomerProfile = {
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name ?? '',
    lastName: customer.last_name ?? '',
    phone: customer.phone,
    acceptsMarketing: customer.accepts_marketing,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  }

  return NextResponse.json(profile)
}

/**
 * PATCH /api/account/profile
 * Updates the current customer's profile
 */
export async function PATCH(request: Request) {
  const tenantSlug = await getTenantSlug()
  const session = await getCustomerSession()

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: UpdateProfileRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Build update fields
  const updates: string[] = []
  const values: (string | boolean | null)[] = []

  if (body.firstName !== undefined) {
    updates.push('first_name')
    values.push(body.firstName)
  }
  if (body.lastName !== undefined) {
    updates.push('last_name')
    values.push(body.lastName)
  }
  if (body.phone !== undefined) {
    updates.push('phone')
    values.push(body.phone)
  }
  if (body.acceptsMarketing !== undefined) {
    updates.push('accepts_marketing')
    values.push(body.acceptsMarketing)
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Update customer - using individual queries based on what fields changed
  const result = await withTenant(tenantSlug, async () => {
    // Build and execute update based on provided fields
    if (body.firstName !== undefined && body.lastName !== undefined && body.phone !== undefined && body.acceptsMarketing !== undefined) {
      return sql<{
        id: string
        email: string
        first_name: string | null
        last_name: string | null
        phone: string | null
        accepts_marketing: boolean
        created_at: string
        updated_at: string
      }>`
        UPDATE customers
        SET
          first_name = ${body.firstName},
          last_name = ${body.lastName},
          phone = ${body.phone},
          accepts_marketing = ${body.acceptsMarketing},
          accepts_marketing_updated_at = CASE
            WHEN accepts_marketing != ${body.acceptsMarketing} THEN NOW()
            ELSE accepts_marketing_updated_at
          END,
          updated_at = NOW()
        WHERE id = ${session.customerId}
        RETURNING id, email, first_name, last_name, phone,
          COALESCE(accepts_marketing, false) as accepts_marketing,
          created_at, updated_at
      `
    }

    // Handle partial updates - update what we have
    return sql<{
      id: string
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      accepts_marketing: boolean
      created_at: string
      updated_at: string
    }>`
      UPDATE customers
      SET
        first_name = COALESCE(${body.firstName ?? null}, first_name),
        last_name = COALESCE(${body.lastName ?? null}, last_name),
        phone = CASE WHEN ${body.phone !== undefined} THEN ${body.phone ?? null} ELSE phone END,
        accepts_marketing = COALESCE(${body.acceptsMarketing ?? null}, accepts_marketing),
        accepts_marketing_updated_at = CASE
          WHEN ${body.acceptsMarketing !== undefined} AND accepts_marketing != ${body.acceptsMarketing ?? false}
          THEN NOW()
          ELSE accepts_marketing_updated_at
        END,
        updated_at = NOW()
      WHERE id = ${session.customerId}
      RETURNING id, email, first_name, last_name, phone,
        COALESCE(accepts_marketing, false) as accepts_marketing,
        created_at, updated_at
    `
  })

  const customer = result.rows[0]
  if (!customer) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  const profile: CustomerProfile = {
    id: customer.id,
    email: customer.email,
    firstName: customer.first_name ?? '',
    lastName: customer.last_name ?? '',
    phone: customer.phone,
    acceptsMarketing: customer.accepts_marketing,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  }

  return NextResponse.json(profile)
}
