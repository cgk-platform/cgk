export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { recordOnboardingReminder } from '@/lib/creators-admin-ops'

export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { creatorIds, stepId } = body as {
      creatorIds: string[]
      stepId?: string
    }

    if (!Array.isArray(creatorIds) || creatorIds.length === 0) {
      return NextResponse.json(
        { error: 'creatorIds array is required' },
        { status: 400 }
      )
    }

    let sent = 0
    for (const creatorId of creatorIds) {
      if (stepId) {
        await recordOnboardingReminder(tenantSlug, creatorId, stepId)
      }
      // TODO: Send actual reminder email for each creator
      sent++
    }

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    console.error('Error sending bulk reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
