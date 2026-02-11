export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getTeamWithMemories, getSlackUserLinks, linkSlackUser, unlinkSlackUser, getIntegrationStatus } from '@/lib/bri/db'

export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const [team, slackLinks, integrations] = await Promise.all([
    getTeamWithMemories(tenantSlug),
    getSlackUserLinks(tenantSlug),
    getIntegrationStatus(tenantSlug),
  ])

  const teamMembers = team.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
  }))

  return NextResponse.json({
    teamMembers,
    slackLinks,
    slackConnected: integrations.slack.connected,
  })
}

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const body = await request.json()
  const { userId, slackUserId, slackUsername } = body

  await linkSlackUser(tenantSlug, userId, slackUserId, slackUsername)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  await unlinkSlackUser(tenantSlug, userId)

  return NextResponse.json({ success: true })
}
