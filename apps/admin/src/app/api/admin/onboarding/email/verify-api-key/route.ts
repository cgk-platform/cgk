export const dynamic = 'force-dynamic'

import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  checkApiKeyPermissions,
  sendTestEmailWithKey,
  verifyResendApiKey,
  type VerifyApiKeyInput,
} from '@cgk/communications'

/**
 * POST /api/admin/onboarding/email/verify-api-key
 * Verify a Resend API key
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: VerifyApiKeyInput & { sendTestTo?: string; brandName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.apiKey) {
    return NextResponse.json(
      { error: 'Missing required field: apiKey' },
      { status: 400 }
    )
  }

  // Verify the API key
  const result = await verifyResendApiKey(body)

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: 400 }
    )
  }

  // Check permissions if full access key provided
  let permissions: { hasFullAccess: boolean; hasSendingAccess: boolean } | undefined
  if (body.fullAccessKey) {
    permissions = await checkApiKeyPermissions(body.fullAccessKey)
  }

  // Send test email if requested
  let testEmailResult: { success: boolean; messageId?: string; error?: string } | undefined
  if (body.sendTestTo && body.brandName) {
    testEmailResult = await sendTestEmailWithKey(
      body.apiKey,
      body.sendTestTo,
      body.brandName
    )
  }

  // Store the API key encrypted in tenant credentials
  // Note: This would use a tenant credentials service
  await withTenant(tenantSlug, async () => {
    // For now, we just validate - actual storage happens in complete step
    // In production, use encrypted credential storage
  })

  return NextResponse.json({
    valid: true,
    accountInfo: result.accountInfo,
    permissions,
    testEmail: testEmailResult,
  })
}
