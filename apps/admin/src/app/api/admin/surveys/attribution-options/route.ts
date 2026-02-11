export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAttributionOptions, createAttributionOption } from '@/lib/surveys'
import type { CreateAttributionOptionInput } from '@/lib/surveys'

export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeInactive = url.searchParams.get('includeInactive') === 'true'

  const options = await getAttributionOptions(tenantSlug, includeInactive)
  return NextResponse.json({ options })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CreateAttributionOptionInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.label || !body.value) {
    return NextResponse.json(
      { error: 'Missing required fields: label, value' },
      { status: 400 },
    )
  }

  try {
    const option = await createAttributionOption(tenantSlug, body)
    return NextResponse.json({ option }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ error: 'Attribution option value already exists' }, { status: 409 })
    }
    throw error
  }
}
