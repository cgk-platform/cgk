export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCreator } from '@/lib/creators/db'
import { getReminderConfigOrDefault, getApplicableReminderStep } from '@/lib/creators/lifecycle-db'
import type { ReminderChainType } from '@/lib/creators/lifecycle-types'

/**
 * POST /api/admin/creators/reminder-config/test
 * Tests the reminder chain configuration for a specific creator
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: { type?: string; creatorId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !['approval', 'welcome_call'].includes(body.type)) {
    return NextResponse.json(
      { error: 'type must be "approval" or "welcome_call"' },
      { status: 400 }
    )
  }

  if (!body.creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })
  }

  try {
    const creator = await getCreator(tenantSlug, body.creatorId)

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const config = await getReminderConfigOrDefault(tenantSlug)
    const reminderType = body.type as ReminderChainType

    if (reminderType === 'approval') {
      if (!config.approvalEnabled) {
        return NextResponse.json({
          success: false,
          message: 'Approval reminders are disabled',
        })
      }

      if (!creator.approved_at) {
        return NextResponse.json({
          success: false,
          message: 'Creator has not been approved yet',
        })
      }

      const daysSinceApproval = Math.floor(
        (Date.now() - new Date(creator.approved_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      // This would need creator reminder fields from extended query
      const step = getApplicableReminderStep(
        config.approvalSteps,
        daysSinceApproval,
        0, // reminderCount - would come from creator record
        config.maxOnePerDay,
        undefined // lastReminderAt - would come from creator record
      )

      return NextResponse.json({
        success: true,
        creatorName: `${creator.first_name} ${creator.last_name}`,
        daysSinceApproval,
        nextStep: step
          ? {
              order: step.order,
              templateName: step.templateName,
              channels: step.channels,
            }
          : null,
        message: step
          ? `Would send "${step.templateName}" via ${step.channels.join(', ')}`
          : 'No reminder step applicable at this time',
      })
    } else {
      // welcome_call
      if (!config.welcomeCallEnabled) {
        return NextResponse.json({
          success: false,
          message: 'Welcome call reminders are disabled',
        })
      }

      // Would need first_login_at from extended creator query
      return NextResponse.json({
        success: true,
        creatorName: `${creator.first_name} ${creator.last_name}`,
        message: 'Welcome call reminder test would check first login date and call status',
        config: {
          enabled: config.welcomeCallEnabled,
          stepsCount: config.welcomeCallSteps.length,
          eventTypeId: config.welcomeCallEventTypeId,
        },
      })
    }
  } catch (error) {
    console.error('[reminder-config/test] POST error:', error)
    return NextResponse.json({ error: 'Failed to test reminder' }, { status: 500 })
  }
}
