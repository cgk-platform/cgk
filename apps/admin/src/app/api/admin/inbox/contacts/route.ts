/**
 * Inbox Contacts API
 * GET /api/admin/inbox/contacts - List contacts
 * POST /api/admin/inbox/contacts - Create new contact
 */

import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  createContact,
  getContacts,
  type ContactFilters,
  type CreateContactInput,
} from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const url = new URL(req.url)

  const filters: ContactFilters = {
    contactType: url.searchParams.get('contactType') as ContactFilters['contactType'] || undefined,
    search: url.searchParams.get('search') || undefined,
    limit: parseInt(url.searchParams.get('limit') || '50', 10),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
  }

  const tagsParam = url.searchParams.get('tags')
  if (tagsParam) {
    filters.tags = tagsParam.split(',')
  }

  const { contacts, total } = await getContacts(tenantId, filters)

  return Response.json({
    contacts,
    total,
    limit: filters.limit,
    offset: filters.offset,
  })
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as CreateContactInput

  if (!body.name || !body.contactType) {
    return Response.json(
      { error: 'name and contactType are required' },
      { status: 400 }
    )
  }

  const contact = await createContact(auth.tenantId, body)

  return Response.json({ contact }, { status: 201 })
}
