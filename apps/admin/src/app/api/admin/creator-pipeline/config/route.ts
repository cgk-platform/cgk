/**
 * GET/PATCH /api/admin/creator-pipeline/config
 * Pipeline configuration management
 */

import { headers } from 'next/headers'

import { getPipelineConfig, updatePipelineConfig } from '@/lib/pipeline/db'
import type { PipelineConfig } from '@/lib/pipeline/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const config = await getPipelineConfig(tenantSlug)
    return Response.json(config)
  } catch (error) {
    console.error('Pipeline config error:', error)
    return Response.json(
      { error: 'Failed to fetch pipeline config' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  try {
    const config = (await request.json()) as Partial<PipelineConfig>

    const success = await updatePipelineConfig(tenantSlug, config)

    if (!success) {
      return Response.json({ error: 'Failed to update config' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Pipeline config update error:', error)
    return Response.json(
      { error: 'Failed to update pipeline config' },
      { status: 500 }
    )
  }
}
