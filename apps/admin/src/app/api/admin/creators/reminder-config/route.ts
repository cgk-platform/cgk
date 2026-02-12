export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getReminderConfigOrDefault,
  upsertReminderConfig,
} from '@/lib/creators/lifecycle-db'
import type { CreatorReminderConfig, ReminderStep } from '@/lib/creators/lifecycle-types'

/**
 * GET /api/admin/creators/reminder-config
 * Returns the reminder chain configuration
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  try {
    const config = await getReminderConfigOrDefault(tenantSlug)
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[reminder-config] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/creators/reminder-config
 * Updates the reminder chain configuration
 */
export async function PATCH(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: Partial<Omit<CreatorReminderConfig, 'id' | 'createdAt' | 'updatedAt'>>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate steps if provided
  const validateSteps = (steps: ReminderStep[], fieldName: string): string | null => {
    if (!Array.isArray(steps)) {
      return `${fieldName} must be an array`
    }

    if (steps.length > 5) {
      return `${fieldName} can have at most 5 steps`
    }

    for (const step of steps) {
      if (!step.id || !step.templateId || !step.templateName) {
        return `Each ${fieldName} step must have id, templateId, and templateName`
      }
      if (typeof step.order !== 'number' || step.order < 1) {
        return `Each ${fieldName} step must have a valid order number`
      }
      if (typeof step.daysAfterTrigger !== 'number' || step.daysAfterTrigger < 1) {
        return `Each ${fieldName} step must have daysAfterTrigger >= 1`
      }
      if (!Array.isArray(step.channels) || step.channels.length === 0) {
        return `Each ${fieldName} step must have at least one channel`
      }
      for (const channel of step.channels) {
        if (channel !== 'email' && channel !== 'sms') {
          return `Invalid channel in ${fieldName}: ${channel}`
        }
      }
    }

    return null
  }

  if (body.approvalSteps) {
    const error = validateSteps(body.approvalSteps, 'approvalSteps')
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
  }

  if (body.welcomeCallSteps) {
    const error = validateSteps(body.welcomeCallSteps, 'welcomeCallSteps')
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }
  }

  // Validate escalation days if provided
  if (
    body.approvalEscalationDays !== undefined &&
    (typeof body.approvalEscalationDays !== 'number' || body.approvalEscalationDays < 1)
  ) {
    return NextResponse.json(
      { error: 'approvalEscalationDays must be a positive number' },
      { status: 400 }
    )
  }

  // Validate schedule time format if provided
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (body.approvalScheduleTime && !timeRegex.test(body.approvalScheduleTime)) {
    return NextResponse.json(
      { error: 'approvalScheduleTime must be in HH:MM format' },
      { status: 400 }
    )
  }
  if (body.welcomeCallScheduleTime && !timeRegex.test(body.welcomeCallScheduleTime)) {
    return NextResponse.json(
      { error: 'welcomeCallScheduleTime must be in HH:MM format' },
      { status: 400 }
    )
  }

  try {
    const config = await upsertReminderConfig(tenantSlug, body)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[reminder-config] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
}
