export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getSlackConfig, upsertSlackConfig, deleteSlackConfig } from '@/lib/surveys'
import type { UpdateSlackConfigInput } from '@/lib/surveys'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const surveyId = url.searchParams.get('surveyId') || undefined

  const config = await getSlackConfig(tenantSlug, surveyId)
  return NextResponse.json({ config })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: UpdateSlackConfigInput & { surveyId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { surveyId, ...input } = body
  const config = await upsertSlackConfig(tenantSlug, input, surveyId)
  return NextResponse.json({ config })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const surveyId = url.searchParams.get('surveyId') || undefined

  const deleted = await deleteSlackConfig(tenantSlug, surveyId)

  if (!deleted) {
    return NextResponse.json({ error: 'Slack config not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
