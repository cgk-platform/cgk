/**
 * DELETE /api/admin/creator-pipeline/filters/[id]
 * Delete a saved filter
 */

import { headers } from 'next/headers'

import { deleteSavedFilter } from '@/lib/pipeline/db'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: filterId } = await params

  try {
    const success = await deleteSavedFilter(tenantSlug, filterId, userId || undefined)

    if (!success) {
      return Response.json({ error: 'Filter not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Saved filter delete error:', error)
    return Response.json(
      { error: 'Failed to delete saved filter' },
      { status: 500 }
    )
  }
}
