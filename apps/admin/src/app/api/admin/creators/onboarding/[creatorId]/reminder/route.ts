export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { recordOnboardingReminder } from '@/lib/creators-admin-ops'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const { creatorId } = await params
    const body = await request.json()
    const { stepId } = body as { stepId: string }

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    await recordOnboardingReminder(tenantSlug, creatorId, stepId)

    // TODO: Send actual reminder email

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}
