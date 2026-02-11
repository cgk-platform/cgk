export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  canSendEmails,
  completeEmailSetup,
  getEmailSetupStatus,
  getOnboardingState,
  type CompleteEmailSetupInput,
} from '@cgk/communications'

/**
 * GET /api/admin/onboarding/email/complete
 * Get email setup status and onboarding state
 */
export async function GET(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const url = new URL(request.url)
  const includeState = url.searchParams.get('includeState') === 'true'

  // Get current status
  const status = await withTenant(tenantSlug, () => getEmailSetupStatus())

  // Check if sending is allowed
  const sendingCheck = await withTenant(tenantSlug, () => canSendEmails())

  // Optionally include full onboarding state
  let state: Awaited<ReturnType<typeof getOnboardingState>> | undefined
  if (includeState) {
    state = await withTenant(tenantSlug, () => getOnboardingState())
  }

  return NextResponse.json({
    status,
    canSendEmails: sendingCheck.allowed,
    sendingBlockedReason: sendingCheck.reason,
    state,
  })
}

/**
 * POST /api/admin/onboarding/email/complete
 * Complete or skip email setup
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: CompleteEmailSetupInput
  try {
    body = await request.json()
  } catch {
    // Empty body is valid (means complete, not skip)
    body = {}
  }

  const result = await withTenant(tenantSlug, () => completeEmailSetup(body))

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        status: result.status,
      },
      { status: 400 }
    )
  }

  // Get updated sending status
  const sendingCheck = await withTenant(tenantSlug, () => canSendEmails())

  return NextResponse.json({
    success: true,
    status: result.status,
    canSendEmails: sendingCheck.allowed,
    sendingBlockedReason: sendingCheck.reason,
  })
}
