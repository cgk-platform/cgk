export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTeamDefaults, saveTeamDefaults, getTeamWithMemories } from '@/lib/bri/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [defaults, team] = await Promise.all([
    getTeamDefaults(tenantSlug),
    getTeamWithMemories(tenantSlug),
  ])

  const teamMembers = team.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
  }))

  return NextResponse.json({ defaults, teamMembers })
}

export async function PUT(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()

  const defaults = await saveTeamDefaults(tenantSlug, body)

  return NextResponse.json({ defaults })
}
