/**
 * Abandoned Checkout Recovery API Route
 * POST: Trigger recovery email for an abandoned checkout
 */

export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { sendJob } from '@cgk/jobs'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  getAbandonedCheckout,
  getRecoverySettings,
  scheduleRecoveryEmail,
  incrementRecoveryEmailCount,
} from '@/lib/abandoned-checkouts/db'

interface RecoverRequest {
  sequenceNumber?: number
  incentiveCode?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: RecoverRequest = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional
  }

  try {
    const result = await withTenant(tenantSlug, async () => {
      const checkout = await getAbandonedCheckout(id)

      if (!checkout) {
        return { error: 'Abandoned checkout not found', status: 404 }
      }

      if (checkout.status !== 'abandoned') {
        return { error: 'Checkout is not in abandoned status', status: 400 }
      }

      if (!checkout.customerEmail) {
        return { error: 'No customer email available for recovery', status: 400 }
      }

      if (checkout.recoveryEmailCount >= checkout.maxRecoveryEmails) {
        return { error: 'Maximum recovery emails already sent', status: 400 }
      }

      const settings = await getRecoverySettings()
      if (!settings?.enabled) {
        return { error: 'Recovery emails are disabled', status: 400 }
      }

      // Determine sequence number and incentive code
      const sequenceNumber = body.sequenceNumber || checkout.recoveryEmailCount + 1
      let incentiveCode = body.incentiveCode

      // Use default incentive code from settings if not provided
      if (!incentiveCode) {
        if (sequenceNumber === 1) incentiveCode = settings.sequence1IncentiveCode || undefined
        else if (sequenceNumber === 2) incentiveCode = settings.sequence2IncentiveCode || undefined
        else if (sequenceNumber === 3) incentiveCode = settings.sequence3IncentiveCode || undefined
      }

      // Schedule email for immediate send
      const email = await scheduleRecoveryEmail(
        checkout.id,
        sequenceNumber,
        new Date(),
        incentiveCode,
      )

      // Increment the recovery email count
      await incrementRecoveryEmailCount(checkout.id)

      return {
        success: true,
        email,
        checkout,
      }
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }

    // Send job to process the recovery email
    // Note: The 'recovery.emailScheduled' event is defined in @cgk/jobs events.ts
    await sendJob('recovery.emailScheduled' as keyof import('@cgk/jobs').JobEvents, {
      tenantId: tenantSlug,
      emailId: result.email.id,
      checkoutId: result.checkout.id,
      sequenceNumber: result.email.sequenceNumber,
    } as never)

    return NextResponse.json({
      success: true,
      message: 'Recovery email scheduled',
      emailId: result.email.id,
    })
  } catch (error) {
    console.error('Failed to trigger recovery:', error)
    return NextResponse.json(
      { error: 'Failed to trigger recovery email' },
      { status: 500 },
    )
  }
}
