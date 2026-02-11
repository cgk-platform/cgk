export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { updateCreatorStage } from '@/lib/creators/db'
import { PIPELINE_STAGES, type CreatorStatus } from '@/lib/creators/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { stage?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.stage || !PIPELINE_STAGES.includes(body.stage as CreatorStatus)) {
    return NextResponse.json(
      { error: `Invalid stage. Must be one of: ${PIPELINE_STAGES.join(', ')}` },
      { status: 400 },
    )
  }

  const newStatus = body.stage as CreatorStatus
  const success = await updateCreatorStage(tenantSlug, id, newStatus)

  if (!success) {
    return NextResponse.json({ error: 'Creator not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ success: true, stage: newStatus })
}
