/**
 * Contact by ID API
 * GET /api/admin/inbox/contacts/[id] - Get single contact
 * PATCH /api/admin/inbox/contacts/[id] - Update contact
 * DELETE /api/admin/inbox/contacts/[id] - Delete contact
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  deleteContact,
  getContact,
  updateContact,
  type UpdateContactInput,
} from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const contact = await getContact(tenantId, id)

  if (!contact) {
    return Response.json({ error: 'Contact not found' }, { status: 404 })
  }

  return Response.json({ contact })
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateContactInput

  const contact = await updateContact(auth.tenantId, id, body)

  if (!contact) {
    return Response.json({ error: 'Contact not found' }, { status: 404 })
  }

  return Response.json({ contact })
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const deleted = await deleteContact(auth.tenantId, id)

  if (!deleted) {
    return Response.json({ error: 'Contact not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
