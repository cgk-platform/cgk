/**
 * GET/POST /api/admin/creator-pipeline/triggers
 * Pipeline automation trigger management
 */

import { headers } from 'next/headers'

import { getPipelineTriggers, createPipelineTrigger } from '@/lib/pipeline/db'
import type { PipelineTrigger } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const triggers = await getPipelineTriggers(tenantSlug)
    return Response.json({ triggers })
  } catch (error) {
    console.error('Pipeline triggers error:', error)
    return Response.json(
      { error: 'Failed to fetch pipeline triggers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as Omit<
      PipelineTrigger,
      'id' | 'createdAt' | 'updatedAt'
    >

    if (!body.name) {
      return Response.json({ error: 'name is required' }, { status: 400 })
    }

    if (!body.triggerType) {
      return Response.json({ error: 'triggerType is required' }, { status: 400 })
    }

    if (!body.actions || !Array.isArray(body.actions)) {
      return Response.json({ error: 'actions array is required' }, { status: 400 })
    }

    const trigger = await createPipelineTrigger(tenantSlug, {
      name: body.name,
      enabled: body.enabled ?? true,
      triggerType: body.triggerType,
      triggerStage: body.triggerStage,
      triggerDays: body.triggerDays,
      triggerValueCents: body.triggerValueCents,
      actions: body.actions,
    })

    return Response.json({ success: true, trigger })
  } catch (error) {
    console.error('Pipeline trigger create error:', error)
    return Response.json(
      { error: 'Failed to create pipeline trigger' },
      { status: 500 }
    )
  }
}
