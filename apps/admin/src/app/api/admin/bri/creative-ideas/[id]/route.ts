export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreativeIdea, updateCreativeIdea } from '@/lib/bri/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const result = await getCreativeIdea(tenantSlug, id)

  if (!result) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id } = await params
  const body = await request.json()

  const idea = await updateCreativeIdea(tenantSlug, id, body)

  return NextResponse.json({ idea })
}
