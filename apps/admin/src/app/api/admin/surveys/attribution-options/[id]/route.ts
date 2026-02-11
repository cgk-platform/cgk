export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { updateAttributionOption, deleteAttributionOption } from '@/lib/surveys'
import type { CreateAttributionOptionInput } from '@/lib/surveys'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<CreateAttributionOptionInput> & { is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const option = await updateAttributionOption(tenantSlug, id, body)

    if (!option) {
      return NextResponse.json({ error: 'Attribution option not found' }, { status: 404 })
    }

    return NextResponse.json({ option })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json({ error: 'Attribution option value already exists' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const { id } = await params

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const deleted = await deleteAttributionOption(tenantSlug, id)

  if (!deleted) {
    return NextResponse.json(
      { error: 'Attribution option not found or is a system option' },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true })
}
