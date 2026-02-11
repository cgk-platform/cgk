/**
 * Treasury Settings database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  TreasurySettings,
  UpdateTreasurySettingsInput,
  TopupSettings,
  UpdateTopupSettingsInput,
} from '../types'

/**
 * Get treasury settings
 */
export async function getTreasurySettings(
  tenantSlug: string
): Promise<TreasurySettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_settings
      WHERE id = 'default'
    `

    if (result.rows.length === 0) {
      // Create default settings if they don't exist
      const insertResult = await sql`
        INSERT INTO treasury_settings (id)
        VALUES ('default')
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `
      if (insertResult.rows.length > 0) {
        return insertResult.rows[0] as TreasurySettings
      }
      // If insert failed (race condition), fetch again
      const refetchResult = await sql`
        SELECT * FROM treasury_settings WHERE id = 'default'
      `
      return refetchResult.rows[0] as TreasurySettings
    }

    return result.rows[0] as TreasurySettings
  })
}

/**
 * Update treasury settings
 */
export async function updateTreasurySettings(
  tenantSlug: string,
  input: UpdateTreasurySettingsInput
): Promise<TreasurySettings> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.treasurer_email !== undefined) {
      paramIndex++
      updates.push(`treasurer_email = $${paramIndex}`)
      values.push(input.treasurer_email)
    }

    if (input.treasurer_name !== undefined) {
      paramIndex++
      updates.push(`treasurer_name = $${paramIndex}`)
      values.push(input.treasurer_name)
    }

    if (input.default_signers !== undefined) {
      paramIndex++
      updates.push(`default_signers = $${paramIndex}`)
      values.push(input.default_signers)
    }

    if (input.auto_send_enabled !== undefined) {
      paramIndex++
      updates.push(`auto_send_enabled = $${paramIndex}`)
      values.push(input.auto_send_enabled)
    }

    if (input.auto_send_delay_hours !== undefined) {
      paramIndex++
      updates.push(`auto_send_delay_hours = $${paramIndex}`)
      values.push(input.auto_send_delay_hours)
    }

    if (input.auto_send_max_amount_cents !== undefined) {
      paramIndex++
      updates.push(`auto_send_max_amount_cents = $${paramIndex}`)
      values.push(input.auto_send_max_amount_cents)
    }

    if (input.low_balance_alert_threshold_cents !== undefined) {
      paramIndex++
      updates.push(`low_balance_alert_threshold_cents = $${paramIndex}`)
      values.push(input.low_balance_alert_threshold_cents)
    }

    if (input.slack_webhook_url !== undefined) {
      paramIndex++
      updates.push(`slack_webhook_url = $${paramIndex}`)
      values.push(input.slack_webhook_url)
    }

    if (input.slack_notifications_enabled !== undefined) {
      paramIndex++
      updates.push(`slack_notifications_enabled = $${paramIndex}`)
      values.push(input.slack_notifications_enabled)
    }

    if (updates.length === 0) {
      return getTreasurySettings(tenantSlug)
    }

    updates.push('updated_at = NOW()')

    const result = await sql.query(
      `UPDATE treasury_settings
       SET ${updates.join(', ')}
       WHERE id = 'default'
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      // Settings don't exist, create them
      await sql`INSERT INTO treasury_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`
      // Retry update
      const retryResult = await sql.query(
        `UPDATE treasury_settings
         SET ${updates.join(', ')}
         WHERE id = 'default'
         RETURNING *`,
        values
      )
      return retryResult.rows[0] as TreasurySettings
    }

    return result.rows[0] as TreasurySettings
  })
}

/**
 * Get topup settings
 */
export async function getTopupSettings(
  tenantSlug: string
): Promise<TopupSettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM topup_settings
      WHERE id = 'default'
    `

    if (result.rows.length === 0) {
      // Create default settings if they don't exist
      const insertResult = await sql`
        INSERT INTO topup_settings (id)
        VALUES ('default')
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `
      if (insertResult.rows.length > 0) {
        return insertResult.rows[0] as TopupSettings
      }
      // If insert failed (race condition), fetch again
      const refetchResult = await sql`
        SELECT * FROM topup_settings WHERE id = 'default'
      `
      return refetchResult.rows[0] as TopupSettings
    }

    return result.rows[0] as TopupSettings
  })
}

/**
 * Update topup settings
 */
export async function updateTopupSettings(
  tenantSlug: string,
  input: UpdateTopupSettingsInput
): Promise<TopupSettings> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.default_source_id !== undefined) {
      paramIndex++
      updates.push(`default_source_id = $${paramIndex}`)
      values.push(input.default_source_id)
    }

    if (input.default_source_last4 !== undefined) {
      paramIndex++
      updates.push(`default_source_last4 = $${paramIndex}`)
      values.push(input.default_source_last4)
    }

    if (input.default_source_bank_name !== undefined) {
      paramIndex++
      updates.push(`default_source_bank_name = $${paramIndex}`)
      values.push(input.default_source_bank_name)
    }

    if (input.auto_topup_enabled !== undefined) {
      paramIndex++
      updates.push(`auto_topup_enabled = $${paramIndex}`)
      values.push(input.auto_topup_enabled)
    }

    if (input.auto_topup_threshold_cents !== undefined) {
      paramIndex++
      updates.push(`auto_topup_threshold_cents = $${paramIndex}`)
      values.push(input.auto_topup_threshold_cents)
    }

    if (input.auto_topup_amount_cents !== undefined) {
      paramIndex++
      updates.push(`auto_topup_amount_cents = $${paramIndex}`)
      values.push(input.auto_topup_amount_cents)
    }

    if (updates.length === 0) {
      return getTopupSettings(tenantSlug)
    }

    updates.push('updated_at = NOW()')

    const result = await sql.query(
      `UPDATE topup_settings
       SET ${updates.join(', ')}
       WHERE id = 'default'
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      // Settings don't exist, create them
      await sql`INSERT INTO topup_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING`
      // Retry update
      const retryResult = await sql.query(
        `UPDATE topup_settings
         SET ${updates.join(', ')}
         WHERE id = 'default'
         RETURNING *`,
        values
      )
      return retryResult.rows[0] as TopupSettings
    }

    return result.rows[0] as TopupSettings
  })
}

/**
 * Check if auto-send is enabled and get configuration
 */
export async function getAutoSendConfig(
  tenantSlug: string
): Promise<{
  enabled: boolean
  delayHours: number
  maxAmountCents: number | null
  treasurerEmail: string | null
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        auto_send_enabled as enabled,
        auto_send_delay_hours as "delayHours",
        auto_send_max_amount_cents as "maxAmountCents",
        treasurer_email as "treasurerEmail"
      FROM treasury_settings
      WHERE id = 'default'
    `

    if (result.rows.length === 0) {
      return {
        enabled: false,
        delayHours: 24,
        maxAmountCents: null,
        treasurerEmail: null,
      }
    }

    return result.rows[0] as {
      enabled: boolean
      delayHours: number
      maxAmountCents: number | null
      treasurerEmail: string | null
    }
  })
}

/**
 * Check if auto-topup is enabled and get configuration
 */
export async function getAutoTopupConfig(
  tenantSlug: string
): Promise<{
  enabled: boolean
  thresholdCents: number
  amountCents: number
  sourceId: string | null
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        auto_topup_enabled as enabled,
        auto_topup_threshold_cents as "thresholdCents",
        auto_topup_amount_cents as "amountCents",
        default_source_id as "sourceId"
      FROM topup_settings
      WHERE id = 'default'
    `

    if (result.rows.length === 0) {
      return {
        enabled: false,
        thresholdCents: 0,
        amountCents: 0,
        sourceId: null,
      }
    }

    return result.rows[0] as {
      enabled: boolean
      thresholdCents: number
      amountCents: number
      sourceId: string | null
    }
  })
}
