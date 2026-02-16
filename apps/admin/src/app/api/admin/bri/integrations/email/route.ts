export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { sql, withTenant } from '@cgk-platform/db'
import {
  getTenantResendConfig,
  saveTenantResendConfig,
} from '@cgk-platform/integrations'

interface BriEmailConfig {
  enabled: boolean
  provider: 'resend' | 'none'
  fromEmail: string | null
  fromName: string | null
  replyTo: string | null
  configuredAt: string | null
}

/**
 * GET /api/admin/bri/integrations/email
 * Get email integration config for BRI
 */
export async function GET() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  // Check BRI settings for email outreach flag
  const briSettingsResult = await withTenant(tenantSlug, async () => {
    return sql`
      SELECT enable_email_outreach as "enableEmailOutreach"
      FROM bri_settings
      LIMIT 1
    `
  })

  const briSettings = briSettingsResult.rows[0] as { enableEmailOutreach?: boolean } | undefined

  // Get Resend config from tenant credentials
  const resendConfig = await getTenantResendConfig(tenantSlug)

  const config: BriEmailConfig = {
    enabled: briSettings?.enableEmailOutreach ?? false,
    provider: resendConfig ? 'resend' : 'none',
    fromEmail: resendConfig?.defaultFromEmail ?? null,
    fromName: resendConfig?.defaultFromName ?? null,
    replyTo: resendConfig?.defaultReplyTo ?? null,
    configuredAt: resendConfig?.lastVerifiedAt?.toISOString() ?? null,
  }

  return NextResponse.json({ config })
}

/**
 * POST /api/admin/bri/integrations/email
 * Save email integration config for BRI
 */
export async function POST(request: Request) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let body: {
    enabled?: boolean
    apiKey?: string
    fromEmail?: string
    fromName?: string
    replyTo?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { enabled, apiKey, fromEmail, fromName, replyTo } = body

  // Update BRI settings to enable/disable email outreach
  if (typeof enabled === 'boolean') {
    await withTenant(tenantSlug, async () => {
      return sql`
        UPDATE bri_settings
        SET enable_email_outreach = ${enabled}, updated_at = NOW()
        WHERE id = (SELECT id FROM bri_settings LIMIT 1)
      `
    })
  }

  // If API key provided, save/update Resend config
  if (apiKey) {
    if (!fromEmail) {
      return NextResponse.json(
        { error: 'From email is required when providing an API key' },
        { status: 400 }
      )
    }

    await saveTenantResendConfig(tenantSlug, {
      apiKey,
      defaultFromEmail: fromEmail,
      defaultFromName: fromName || undefined,
      defaultReplyTo: replyTo || undefined,
    })
  }

  // Get updated config
  const resendConfig = await getTenantResendConfig(tenantSlug)

  const config: BriEmailConfig = {
    enabled: enabled ?? false,
    provider: resendConfig ? 'resend' : 'none',
    fromEmail: resendConfig?.defaultFromEmail ?? null,
    fromName: resendConfig?.defaultFromName ?? null,
    replyTo: resendConfig?.defaultReplyTo ?? null,
    configuredAt: resendConfig?.lastVerifiedAt?.toISOString() ?? null,
  }

  return NextResponse.json({
    success: true,
    message: 'Email integration config saved',
    config,
  })
}
