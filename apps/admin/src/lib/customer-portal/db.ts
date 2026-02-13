/**
 * Customer Portal Database Operations
 *
 * All operations use tenant isolation via withTenant wrapper.
 */

import { withTenant, sql } from '@cgk-platform/db'

import {
  DEFAULT_PORTAL_BRANDING,
  DEFAULT_PORTAL_FEATURES,
  DEFAULT_PORTAL_MESSAGING,
  type CommunicationPreference,
  type PortalAnalyticsSummary,
  type PortalBranding,
  type PortalCustomer,
  type PortalFeatures,
  type PortalMessaging,
  type PortalSettings,
} from './types'

/**
 * Get or create portal settings for a tenant
 */
export async function getPortalSettings(tenantSlug: string): Promise<PortalSettings> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, tenant_id, features, branding, messaging, custom_domain,
             ssl_status, enabled, created_at, updated_at
      FROM portal_settings
      LIMIT 1
    `

    if (result.rows.length > 0) {
      const row = result.rows[0]!
      return {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        features: (row.features as PortalFeatures) || DEFAULT_PORTAL_FEATURES,
        branding: (row.branding as PortalBranding) || DEFAULT_PORTAL_BRANDING,
        messaging: (row.messaging as PortalMessaging) || DEFAULT_PORTAL_MESSAGING,
        customDomain: row.custom_domain as string | null,
        sslStatus: row.ssl_status as PortalSettings['sslStatus'],
        enabled: row.enabled as boolean,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }
    }

    // Create default settings if none exist
    const insertResult = await sql`
      INSERT INTO portal_settings (features, branding, messaging, enabled)
      VALUES (
        ${JSON.stringify(DEFAULT_PORTAL_FEATURES)}::jsonb,
        ${JSON.stringify(DEFAULT_PORTAL_BRANDING)}::jsonb,
        ${JSON.stringify(DEFAULT_PORTAL_MESSAGING)}::jsonb,
        true
      )
      RETURNING id, tenant_id, features, branding, messaging, custom_domain,
                ssl_status, enabled, created_at, updated_at
    `

    const newRow = insertResult.rows[0]!
    return {
      id: newRow.id as string,
      tenantId: newRow.tenant_id as string,
      features: newRow.features as PortalFeatures,
      branding: newRow.branding as PortalBranding,
      messaging: newRow.messaging as PortalMessaging,
      customDomain: newRow.custom_domain as string | null,
      sslStatus: newRow.ssl_status as PortalSettings['sslStatus'],
      enabled: newRow.enabled as boolean,
      createdAt: newRow.created_at as string,
      updatedAt: newRow.updated_at as string,
    }
  })
}

/**
 * Update portal feature flags
 */
export async function updatePortalFeatures(
  tenantSlug: string,
  features: Partial<PortalFeatures>
): Promise<PortalFeatures> {
  return withTenant(tenantSlug, async () => {
    // First get current features to merge
    const currentResult = await sql`
      SELECT features FROM portal_settings LIMIT 1
    `

    const currentFeatures =
      currentResult.rows.length > 0
        ? (currentResult.rows[0]!.features as PortalFeatures)
        : DEFAULT_PORTAL_FEATURES

    const mergedFeatures = { ...currentFeatures, ...features }

    if (currentResult.rows.length > 0) {
      await sql`
        UPDATE portal_settings
        SET features = ${JSON.stringify(mergedFeatures)}::jsonb,
            updated_at = NOW()
      `
    } else {
      await sql`
        INSERT INTO portal_settings (features, branding, messaging, enabled)
        VALUES (
          ${JSON.stringify(mergedFeatures)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_BRANDING)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_MESSAGING)}::jsonb,
          true
        )
      `
    }

    return mergedFeatures
  })
}

/**
 * Update portal branding settings
 */
export async function updatePortalBranding(
  tenantSlug: string,
  branding: Partial<PortalBranding>
): Promise<PortalBranding> {
  return withTenant(tenantSlug, async () => {
    const currentResult = await sql`
      SELECT branding FROM portal_settings LIMIT 1
    `

    const currentBranding =
      currentResult.rows.length > 0
        ? (currentResult.rows[0]!.branding as PortalBranding)
        : DEFAULT_PORTAL_BRANDING

    const mergedBranding = { ...currentBranding, ...branding }

    if (currentResult.rows.length > 0) {
      await sql`
        UPDATE portal_settings
        SET branding = ${JSON.stringify(mergedBranding)}::jsonb,
            updated_at = NOW()
      `
    } else {
      await sql`
        INSERT INTO portal_settings (features, branding, messaging, enabled)
        VALUES (
          ${JSON.stringify(DEFAULT_PORTAL_FEATURES)}::jsonb,
          ${JSON.stringify(mergedBranding)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_MESSAGING)}::jsonb,
          true
        )
      `
    }

    return mergedBranding
  })
}

/**
 * Update portal messaging strings
 */
export async function updatePortalMessaging(
  tenantSlug: string,
  messaging: Partial<PortalMessaging>
): Promise<PortalMessaging> {
  return withTenant(tenantSlug, async () => {
    const currentResult = await sql`
      SELECT messaging FROM portal_settings LIMIT 1
    `

    const currentMessaging =
      currentResult.rows.length > 0
        ? (currentResult.rows[0]!.messaging as PortalMessaging)
        : DEFAULT_PORTAL_MESSAGING

    const mergedMessaging = { ...currentMessaging, ...messaging }

    if (currentResult.rows.length > 0) {
      await sql`
        UPDATE portal_settings
        SET messaging = ${JSON.stringify(mergedMessaging)}::jsonb,
            updated_at = NOW()
      `
    } else {
      await sql`
        INSERT INTO portal_settings (features, branding, messaging, enabled)
        VALUES (
          ${JSON.stringify(DEFAULT_PORTAL_FEATURES)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_BRANDING)}::jsonb,
          ${JSON.stringify(mergedMessaging)}::jsonb,
          true
        )
      `
    }

    return mergedMessaging
  })
}

/**
 * Toggle portal enabled status
 */
export async function setPortalEnabled(tenantSlug: string, enabled: boolean): Promise<void> {
  return withTenant(tenantSlug, async () => {
    const existsResult = await sql`
      SELECT id FROM portal_settings LIMIT 1
    `

    if (existsResult.rows.length > 0) {
      await sql`
        UPDATE portal_settings SET enabled = ${enabled}, updated_at = NOW()
      `
    } else {
      await sql`
        INSERT INTO portal_settings (features, branding, messaging, enabled)
        VALUES (
          ${JSON.stringify(DEFAULT_PORTAL_FEATURES)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_BRANDING)}::jsonb,
          ${JSON.stringify(DEFAULT_PORTAL_MESSAGING)}::jsonb,
          ${enabled}
        )
      `
    }
  })
}

/**
 * Search customers for portal lookup
 */
export async function searchPortalCustomers(
  tenantSlug: string,
  query: string,
  limit = 20
): Promise<PortalCustomer[]> {
  return withTenant(tenantSlug, async () => {
    const searchPattern = `%${query}%`
    const result = await sql`
      SELECT
        c.id, c.email, c.first_name, c.last_name, c.phone,
        c.orders_count, c.total_spent_cents, c.currency, c.created_at,
        ps.last_login_at, ps.portal_access_enabled
      FROM customers c
      LEFT JOIN portal_sessions ps ON c.id = ps.customer_id
      WHERE
        c.email ILIKE ${searchPattern}
        OR c.first_name ILIKE ${searchPattern}
        OR c.last_name ILIKE ${searchPattern}
        OR c.phone ILIKE ${searchPattern}
      ORDER BY c.total_spent_cents DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      email: row.email as string | null,
      firstName: row.first_name as string | null,
      lastName: row.last_name as string | null,
      phone: row.phone as string | null,
      ordersCount: Number(row.orders_count || 0),
      totalSpentCents: Number(row.total_spent_cents || 0),
      currency: (row.currency as string) || 'USD',
      lastLoginAt: row.last_login_at as string | null,
      portalAccessEnabled: row.portal_access_enabled !== false,
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Get customer by ID for portal admin
 */
export async function getPortalCustomerById(
  tenantSlug: string,
  customerId: string
): Promise<PortalCustomer | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        c.id, c.email, c.first_name, c.last_name, c.phone,
        c.orders_count, c.total_spent_cents, c.currency, c.created_at,
        ps.last_login_at, ps.portal_access_enabled
      FROM customers c
      LEFT JOIN portal_sessions ps ON c.id = ps.customer_id
      WHERE c.id = ${customerId}
      LIMIT 1
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0]!
    return {
      id: row.id as string,
      email: row.email as string | null,
      firstName: row.first_name as string | null,
      lastName: row.last_name as string | null,
      phone: row.phone as string | null,
      ordersCount: Number(row.orders_count || 0),
      totalSpentCents: Number(row.total_spent_cents || 0),
      currency: (row.currency as string) || 'USD',
      lastLoginAt: row.last_login_at as string | null,
      portalAccessEnabled: row.portal_access_enabled !== false,
      createdAt: row.created_at as string,
    }
  })
}

/**
 * Create impersonation session for admin to view customer portal
 */
export async function createImpersonationSession(
  tenantSlug: string,
  customerId: string,
  adminUserId: string,
  reason: string
): Promise<string> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO customer_impersonation_sessions
        (customer_id, admin_user_id, impersonation_reason, actions_performed)
      VALUES (${customerId}, ${adminUserId}, ${reason}, '[]'::jsonb)
      RETURNING id
    `
    return result.rows[0]!.id as string
  })
}

/**
 * End impersonation session
 */
export async function endImpersonationSession(
  tenantSlug: string,
  sessionId: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE customer_impersonation_sessions
      SET ended_at = NOW()
      WHERE id = ${sessionId}
    `
  })
}

/**
 * Log action during impersonation
 */
export async function logImpersonationAction(
  tenantSlug: string,
  sessionId: string,
  action: string
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE customer_impersonation_sessions
      SET actions_performed = actions_performed || ${JSON.stringify([action])}::jsonb
      WHERE id = ${sessionId}
    `
  })
}

/**
 * Get customer communication preferences
 */
export async function getCustomerCommunicationPrefs(
  tenantSlug: string,
  customerId: string
): Promise<CommunicationPreference | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, customer_id, order_confirmations, shipping_updates,
             subscription_reminders, marketing_emails, sms_notifications,
             promotional_sms, created_at, updated_at
      FROM customer_communication_preferences
      WHERE customer_id = ${customerId}
      LIMIT 1
    `

    if (result.rows.length === 0) return null

    const row = result.rows[0]!
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      orderConfirmations: row.order_confirmations as boolean,
      shippingUpdates: row.shipping_updates as boolean,
      subscriptionReminders: row.subscription_reminders as boolean,
      marketingEmails: row.marketing_emails as boolean,
      smsNotifications: row.sms_notifications as boolean,
      promotionalSms: row.promotional_sms as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

/**
 * Update customer communication preferences
 */
export async function updateCustomerCommunicationPrefs(
  tenantSlug: string,
  customerId: string,
  prefs: Partial<Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    const existsResult = await sql`
      SELECT id FROM customer_communication_preferences
      WHERE customer_id = ${customerId}
      LIMIT 1
    `

    if (existsResult.rows.length > 0) {
      // Build dynamic update
      const updates: string[] = []
      const values: unknown[] = []
      let paramIndex = 1

      if (prefs.orderConfirmations !== undefined) {
        updates.push(`order_confirmations = $${paramIndex++}`)
        values.push(prefs.orderConfirmations)
      }
      if (prefs.shippingUpdates !== undefined) {
        updates.push(`shipping_updates = $${paramIndex++}`)
        values.push(prefs.shippingUpdates)
      }
      if (prefs.subscriptionReminders !== undefined) {
        updates.push(`subscription_reminders = $${paramIndex++}`)
        values.push(prefs.subscriptionReminders)
      }
      if (prefs.marketingEmails !== undefined) {
        updates.push(`marketing_emails = $${paramIndex++}`)
        values.push(prefs.marketingEmails)
      }
      if (prefs.smsNotifications !== undefined) {
        updates.push(`sms_notifications = $${paramIndex++}`)
        values.push(prefs.smsNotifications)
      }
      if (prefs.promotionalSms !== undefined) {
        updates.push(`promotional_sms = $${paramIndex++}`)
        values.push(prefs.promotionalSms)
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()')
        values.push(customerId)
        await sql.query(
          `UPDATE customer_communication_preferences
           SET ${updates.join(', ')}
           WHERE customer_id = $${paramIndex}`,
          values
        )
      }
    } else {
      // Insert new record with defaults
      await sql`
        INSERT INTO customer_communication_preferences (
          customer_id, order_confirmations, shipping_updates,
          subscription_reminders, marketing_emails, sms_notifications,
          promotional_sms
        ) VALUES (
          ${customerId},
          ${prefs.orderConfirmations ?? true},
          ${prefs.shippingUpdates ?? true},
          ${prefs.subscriptionReminders ?? true},
          ${prefs.marketingEmails ?? false},
          ${prefs.smsNotifications ?? false},
          ${prefs.promotionalSms ?? false}
        )
      `
    }
  })
}

/**
 * Get portal analytics summary for a date range
 */
export async function getPortalAnalytics(
  tenantSlug: string,
  startDate: Date,
  endDate: Date
): Promise<PortalAnalyticsSummary> {
  return withTenant(tenantSlug, async () => {
    const startStr = startDate.toISOString()
    const endStr = endDate.toISOString()

    // Get aggregate counts
    const countsResult = await sql`
      SELECT
        COUNT(DISTINCT CASE WHEN event_type = 'login' THEN customer_id END) as unique_logins,
        COUNT(CASE WHEN event_type = 'login' THEN 1 END) as total_logins,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
        COUNT(CASE WHEN event_type = 'action' THEN 1 END) as actions
      FROM portal_analytics_events
      WHERE occurred_at >= ${startStr} AND occurred_at <= ${endStr}
    `

    const counts = countsResult.rows[0] || {}

    // Get top pages
    const topPagesResult = await sql`
      SELECT page_path as path, COUNT(*) as views
      FROM portal_analytics_events
      WHERE event_type = 'page_view'
        AND occurred_at >= ${startStr} AND occurred_at <= ${endStr}
        AND page_path IS NOT NULL
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 10
    `

    // Get top actions
    const topActionsResult = await sql`
      SELECT event_name as name, COUNT(*) as count
      FROM portal_analytics_events
      WHERE event_type = 'action'
        AND occurred_at >= ${startStr} AND occurred_at <= ${endStr}
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 10
    `

    // Get logins by day
    const loginsByDayResult = await sql`
      SELECT DATE(occurred_at) as date, COUNT(*) as count
      FROM portal_analytics_events
      WHERE event_type = 'login'
        AND occurred_at >= ${startStr} AND occurred_at <= ${endStr}
      GROUP BY DATE(occurred_at)
      ORDER BY date
    `

    // Get page views by day
    const pageViewsByDayResult = await sql`
      SELECT DATE(occurred_at) as date, COUNT(*) as count
      FROM portal_analytics_events
      WHERE event_type = 'page_view'
        AND occurred_at >= ${startStr} AND occurred_at <= ${endStr}
      GROUP BY DATE(occurred_at)
      ORDER BY date
    `

    return {
      uniqueLogins: Number(counts.unique_logins || 0),
      totalLogins: Number(counts.total_logins || 0),
      pageViews: Number(counts.page_views || 0),
      actions: Number(counts.actions || 0),
      topPages: topPagesResult.rows.map((r) => ({
        path: r.path as string,
        views: Number(r.views),
      })),
      topActions: topActionsResult.rows.map((r) => ({
        name: r.name as string,
        count: Number(r.count),
      })),
      loginsByDay: loginsByDayResult.rows.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
      pageViewsByDay: pageViewsByDayResult.rows.map((r) => ({
        date: String(r.date),
        count: Number(r.count),
      })),
    }
  })
}

/**
 * Toggle portal access for a specific customer
 */
export async function setCustomerPortalAccess(
  tenantSlug: string,
  customerId: string,
  enabled: boolean
): Promise<void> {
  return withTenant(tenantSlug, async () => {
    const existsResult = await sql`
      SELECT id FROM portal_sessions WHERE customer_id = ${customerId} LIMIT 1
    `

    if (existsResult.rows.length > 0) {
      await sql`
        UPDATE portal_sessions
        SET portal_access_enabled = ${enabled}
        WHERE customer_id = ${customerId}
      `
    } else {
      await sql`
        INSERT INTO portal_sessions (customer_id, portal_access_enabled)
        VALUES (${customerId}, ${enabled})
      `
    }
  })
}

/**
 * Get recent impersonation sessions for audit log
 */
export async function getRecentImpersonationSessions(
  tenantSlug: string,
  limit = 50
): Promise<
  Array<{
    id: string
    customerId: string
    customerEmail: string | null
    adminUserId: string
    reason: string
    startedAt: string
    endedAt: string | null
    actionsCount: number
  }>
> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        cis.id, cis.customer_id, c.email as customer_email,
        cis.admin_user_id, cis.impersonation_reason,
        cis.started_at, cis.ended_at,
        jsonb_array_length(cis.actions_performed) as actions_count
      FROM customer_impersonation_sessions cis
      LEFT JOIN customers c ON cis.customer_id = c.id
      ORDER BY cis.started_at DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      customerId: row.customer_id as string,
      customerEmail: row.customer_email as string | null,
      adminUserId: row.admin_user_id as string,
      reason: row.impersonation_reason as string,
      startedAt: row.started_at as string,
      endedAt: row.ended_at as string | null,
      actionsCount: Number(row.actions_count || 0),
    }))
  })
}
