export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTeamWithMemories, addTeamMemory, deleteTeamMemory } from '@/lib/bri/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const teamMembers = await getTeamWithMemories(tenantSlug)

  return NextResponse.json({ teamMembers })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  const memory = await addTeamMemory(tenantSlug, {
    userId: body.userId,
    memoryType: body.memoryType,
    source: body.source,
    content: body.content,
    confidence: body.confidence ?? 1.0,
  })

  return NextResponse.json({ memory })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing memory id' }, { status: 400 })
  }

  await deleteTeamMemory(tenantSlug, id)

  return NextResponse.json({ success: true })
}
