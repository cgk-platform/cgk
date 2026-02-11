export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getBulkSendTemplates, createBulkSendTemplate } from '@/lib/reviews/db'
import type { CreateBulkSendTemplateInput } from '@/lib/reviews/types'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeArchived = url.searchParams.get('include_archived') === 'true'

  const templates = await getBulkSendTemplates(tenantSlug, includeArchived)

  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateBulkSendTemplateInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.subject || !body.body_html) {
    return NextResponse.json(
      { error: 'Missing required fields: name, subject, body_html' },
      { status: 400 },
    )
  }

  const template = await createBulkSendTemplate(tenantSlug, body)

  return NextResponse.json({ template }, { status: 201 })
}
