import { headers } from 'next/headers'

import {
  getPortalCustomerById,
  setCustomerPortalAccess,
  getCustomerCommunicationPrefs,
  updateCustomerCommunicationPrefs,
} from '@/lib/customer-portal/db'
import type { CommunicationPreference } from '@/lib/customer-portal/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/customer-portal/customers/[id]
 * Get customer details and communication preferences
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id } = await params
  const customer = await getPortalCustomerById(tenantSlug, id)

  if (!customer) {
    return Response.json({ error: 'Customer not found' }, { status: 404 })
  }

  const preferences = await getCustomerCommunicationPrefs(tenantSlug, id)

  return Response.json({ customer, preferences })
}

/**
 * PUT /api/admin/customer-portal/customers/[id]
 * Update customer portal access or communication preferences
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id } = await params
  const body = await request.json()
  const { portalAccessEnabled, communicationPreferences } = body as {
    portalAccessEnabled?: boolean
    communicationPreferences?: Partial<
      Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>
    >
  }

  // Verify customer exists
  const customer = await getPortalCustomerById(tenantSlug, id)
  if (!customer) {
    return Response.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Update portal access if specified
  if (portalAccessEnabled !== undefined) {
    await setCustomerPortalAccess(tenantSlug, id, portalAccessEnabled)
  }

  // Update communication preferences if specified
  if (communicationPreferences && Object.keys(communicationPreferences).length > 0) {
    await updateCustomerCommunicationPrefs(tenantSlug, id, communicationPreferences)
  }

  // Return updated data
  const updatedCustomer = await getPortalCustomerById(tenantSlug, id)
  const preferences = await getCustomerCommunicationPrefs(tenantSlug, id)

  return Response.json({ customer: updatedCustomer, preferences })
}
