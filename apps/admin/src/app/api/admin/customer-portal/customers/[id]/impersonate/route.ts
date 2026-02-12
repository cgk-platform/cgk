import { headers } from 'next/headers'

import {
  getPortalCustomerById,
  createImpersonationSession,
  endImpersonationSession,
  logImpersonationAction,
} from '@/lib/customer-portal/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/customer-portal/customers/[id]/impersonate
 * Start an impersonation session for a customer
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const adminUserId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  if (!adminUserId) {
    return Response.json({ error: 'Admin user context required' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { reason } = body as { reason?: string }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    return Response.json(
      { error: 'A reason for impersonation is required (minimum 10 characters)' },
      { status: 400 }
    )
  }

  // Verify customer exists and has portal access
  const customer = await getPortalCustomerById(tenantSlug, id)
  if (!customer) {
    return Response.json({ error: 'Customer not found' }, { status: 404 })
  }

  if (!customer.portalAccessEnabled) {
    return Response.json(
      { error: 'Cannot impersonate customer with disabled portal access' },
      { status: 403 }
    )
  }

  // Create impersonation session
  const sessionId = await createImpersonationSession(
    tenantSlug,
    id,
    adminUserId,
    reason.trim()
  )

  // In a real implementation, this would generate a signed token for the
  // customer portal that allows the admin to view it as the customer
  const impersonationToken = Buffer.from(
    JSON.stringify({
      sessionId,
      customerId: id,
      adminUserId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    })
  ).toString('base64')

  return Response.json({
    sessionId,
    impersonationToken,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    },
    message: 'Impersonation session started. All actions will be logged.',
  })
}

/**
 * DELETE /api/admin/customer-portal/customers/[id]/impersonate
 * End an active impersonation session
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  // Consume params to satisfy Next.js requirements (customer id in path)
  await params
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    return Response.json({ error: 'Session ID required' }, { status: 400 })
  }

  await endImpersonationSession(tenantSlug, sessionId)

  return Response.json({
    message: 'Impersonation session ended',
    sessionId,
  })
}

/**
 * PUT /api/admin/customer-portal/customers/[id]/impersonate
 * Log an action during impersonation
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

  await params // consume params even if unused to avoid Next.js warnings
  const body = await request.json()
  const { sessionId, action } = body as { sessionId?: string; action?: string }

  if (!sessionId || !action) {
    return Response.json({ error: 'Session ID and action are required' }, { status: 400 })
  }

  await logImpersonationAction(tenantSlug, sessionId, action)

  return Response.json({ logged: true })
}
