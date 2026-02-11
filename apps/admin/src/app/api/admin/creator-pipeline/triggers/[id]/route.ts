/**
 * PATCH/DELETE /api/admin/creator-pipeline/triggers/[id]
 * Update or delete a pipeline trigger
 */

import { headers } from 'next/headers'

import { updatePipelineTrigger, deletePipelineTrigger } from '@/lib/pipeline/db'
import type { PipelineTrigger } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: triggerId } = await params

  try {
    const body = (await request.json()) as Partial<
      Omit<PipelineTrigger, 'id' | 'createdAt' | 'updatedAt'>
    >

    const success = await updatePipelineTrigger(tenantSlug, triggerId, body)

    if (!success) {
      return Response.json({ error: 'Trigger not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Pipeline trigger update error:', error)
    return Response.json(
      { error: 'Failed to update pipeline trigger' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const { id: triggerId } = await params

  try {
    const success = await deletePipelineTrigger(tenantSlug, triggerId)

    if (!success) {
      return Response.json({ error: 'Trigger not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Pipeline trigger delete error:', error)
    return Response.json(
      { error: 'Failed to delete pipeline trigger' },
      { status: 500 }
    )
  }
}
