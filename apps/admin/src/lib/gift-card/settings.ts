/**
 * Gift Card Settings Management
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk/db'

import type { GiftCardSettings, GiftCardEmailTemplate } from './types'
import { DEFAULT_GIFT_CARD_SETTINGS } from './types'

/**
 * Get gift card settings for the tenant
 * Returns default settings if none exist
 */
export async function getGiftCardSettings(): Promise<GiftCardSettings> {
  const result = await sql<{
    id: string
    enabled: boolean
    email_enabled: boolean
    default_amount_cents: number
    from_email: string
    admin_notification_enabled: boolean
    admin_notification_email: string
    email_template: GiftCardEmailTemplate
    created_at: string
    updated_at: string
  }>`
    SELECT id, enabled, email_enabled, default_amount_cents, from_email,
           admin_notification_enabled, admin_notification_email, email_template,
           created_at, updated_at
    FROM gift_card_settings
    WHERE id = 'default'
  `

  if (!result.rows[0]) {
    return DEFAULT_GIFT_CARD_SETTINGS
  }

  const row = result.rows[0]
  return {
    enabled: row.enabled,
    email_enabled: row.email_enabled,
    default_amount_cents: row.default_amount_cents,
    from_email: row.from_email,
    admin_notification_enabled: row.admin_notification_enabled,
    admin_notification_email: row.admin_notification_email,
    email_template: {
      ...DEFAULT_GIFT_CARD_SETTINGS.email_template,
      ...(typeof row.email_template === 'object' ? row.email_template : {}),
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Update gift card settings
 */
export async function updateGiftCardSettings(
  updates: Partial<GiftCardSettings>
): Promise<GiftCardSettings> {
  const current = await getGiftCardSettings()

  const enabled = updates.enabled ?? current.enabled
  const emailEnabled = updates.email_enabled ?? current.email_enabled
  const defaultAmountCents = updates.default_amount_cents ?? current.default_amount_cents
  const fromEmail = updates.from_email ?? current.from_email
  const adminNotificationEnabled =
    updates.admin_notification_enabled ?? current.admin_notification_enabled
  const adminNotificationEmail =
    updates.admin_notification_email ?? current.admin_notification_email
  const emailTemplate = updates.email_template
    ? { ...current.email_template, ...updates.email_template }
    : current.email_template

  const emailTemplateJson = JSON.stringify(emailTemplate)

  const result = await sql<{
    id: string
    enabled: boolean
    email_enabled: boolean
    default_amount_cents: number
    from_email: string
    admin_notification_enabled: boolean
    admin_notification_email: string
    email_template: GiftCardEmailTemplate
    created_at: string
    updated_at: string
  }>`
    INSERT INTO gift_card_settings (
      id, enabled, email_enabled, default_amount_cents, from_email,
      admin_notification_enabled, admin_notification_email, email_template
    ) VALUES (
      'default',
      ${enabled},
      ${emailEnabled},
      ${defaultAmountCents},
      ${fromEmail},
      ${adminNotificationEnabled},
      ${adminNotificationEmail},
      ${emailTemplateJson}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      email_enabled = EXCLUDED.email_enabled,
      default_amount_cents = EXCLUDED.default_amount_cents,
      from_email = EXCLUDED.from_email,
      admin_notification_enabled = EXCLUDED.admin_notification_enabled,
      admin_notification_email = EXCLUDED.admin_notification_email,
      email_template = EXCLUDED.email_template,
      updated_at = NOW()
    RETURNING id, enabled, email_enabled, default_amount_cents, from_email,
              admin_notification_enabled, admin_notification_email, email_template,
              created_at, updated_at
  `

  const row = result.rows[0]!
  return {
    enabled: row.enabled,
    email_enabled: row.email_enabled,
    default_amount_cents: row.default_amount_cents,
    from_email: row.from_email,
    admin_notification_enabled: row.admin_notification_enabled,
    admin_notification_email: row.admin_notification_email,
    email_template: row.email_template,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Check if gift card system is enabled
 */
export async function isGiftCardEnabled(): Promise<boolean> {
  const settings = await getGiftCardSettings()
  return settings.enabled
}

/**
 * Check if gift card emails are enabled
 */
export async function isGiftCardEmailEnabled(): Promise<boolean> {
  const settings = await getGiftCardSettings()
  return settings.enabled && settings.email_enabled
}
