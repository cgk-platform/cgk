/**
 * Database operations for abandoned checkout recovery
 * Phase 3E: E-Commerce Recovery
 *
 * @ai-pattern tenant-isolation
 * @ai-required All functions expect to be called within withTenant() context
 */

import { sql } from '@cgk-platform/db'
import type {
  AbandonedCheckout,
  AbandonedCheckoutFilters,
  AbandonedCheckoutLineItem,
  AbandonedCheckoutAddress,
  AbandonedCheckoutStatus,
  RecoveryEmailQueueItem,
  TenantRecoverySettings,
  DraftOrder,
  RecoveryAnalyticsDaily,
  RecoveryStatsResponse,
  ShopifyCheckoutWebhookPayload,
} from './types'

// ============================================================
// Row to Type Mappers
// ============================================================

interface AbandonedCheckoutRow {
  id: string
  shopify_checkout_id: string
  shopify_checkout_token: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_id: string | null
  customer_name: string | null
  cart_total_cents: number
  currency_code: string
  line_items: AbandonedCheckoutLineItem[] | string
  billing_address: AbandonedCheckoutAddress | string | null
  shipping_address: AbandonedCheckoutAddress | string | null
  recovery_url: string | null
  status: AbandonedCheckoutStatus
  recovery_email_count: number
  max_recovery_emails: number
  recovery_run_id: string | null
  last_email_sent_at: string | null
  abandoned_at: string
  recovered_at: string | null
  recovered_order_id: string | null
  created_at: string
  updated_at: string
}

function mapAbandonedCheckoutRow(row: AbandonedCheckoutRow): AbandonedCheckout {
  return {
    id: row.id,
    shopifyCheckoutId: row.shopify_checkout_id,
    shopifyCheckoutToken: row.shopify_checkout_token,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerId: row.customer_id,
    customerName: row.customer_name,
    cartTotalCents: row.cart_total_cents,
    currencyCode: row.currency_code,
    lineItems: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
    billingAddress: row.billing_address
      ? typeof row.billing_address === 'string'
        ? JSON.parse(row.billing_address)
        : row.billing_address
      : null,
    shippingAddress: row.shipping_address
      ? typeof row.shipping_address === 'string'
        ? JSON.parse(row.shipping_address)
        : row.shipping_address
      : null,
    recoveryUrl: row.recovery_url,
    status: row.status,
    recoveryEmailCount: row.recovery_email_count,
    maxRecoveryEmails: row.max_recovery_emails,
    recoveryRunId: row.recovery_run_id,
    lastEmailSentAt: row.last_email_sent_at,
    abandonedAt: row.abandoned_at,
    recoveredAt: row.recovered_at,
    recoveredOrderId: row.recovered_order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface RecoverySettingsRow {
  id: string
  enabled: boolean
  abandonment_timeout_hours: number
  max_recovery_emails: number
  sequence_1_delay_hours: number
  sequence_2_delay_hours: number
  sequence_3_delay_hours: number
  sequence_1_incentive_code: string | null
  sequence_2_incentive_code: string | null
  sequence_3_incentive_code: string | null
  sequence_1_enabled: boolean
  sequence_2_enabled: boolean
  sequence_3_enabled: boolean
  checkout_expiry_days: number
  high_value_threshold_cents: number
  created_at: string
  updated_at: string
}

function mapRecoverySettingsRow(row: RecoverySettingsRow): TenantRecoverySettings {
  return {
    id: row.id,
    enabled: row.enabled,
    abandonmentTimeoutHours: row.abandonment_timeout_hours,
    maxRecoveryEmails: row.max_recovery_emails,
    sequence1DelayHours: row.sequence_1_delay_hours,
    sequence2DelayHours: row.sequence_2_delay_hours,
    sequence3DelayHours: row.sequence_3_delay_hours,
    sequence1IncentiveCode: row.sequence_1_incentive_code,
    sequence2IncentiveCode: row.sequence_2_incentive_code,
    sequence3IncentiveCode: row.sequence_3_incentive_code,
    sequence1Enabled: row.sequence_1_enabled,
    sequence2Enabled: row.sequence_2_enabled,
    sequence3Enabled: row.sequence_3_enabled,
    checkoutExpiryDays: row.checkout_expiry_days,
    highValueThresholdCents: row.high_value_threshold_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface DraftOrderRow {
  id: string
  abandoned_checkout_id: string | null
  shopify_draft_order_id: string
  shopify_draft_order_name: string | null
  customer_email: string | null
  customer_id: string | null
  subtotal_cents: number
  total_cents: number
  currency_code: string
  line_items: AbandonedCheckoutLineItem[] | string
  discount_code: string | null
  discount_amount_cents: number
  status: string
  invoice_sent_at: string | null
  completed_at: string | null
  completed_order_id: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function mapDraftOrderRow(row: DraftOrderRow): DraftOrder {
  return {
    id: row.id,
    abandonedCheckoutId: row.abandoned_checkout_id,
    shopifyDraftOrderId: row.shopify_draft_order_id,
    shopifyDraftOrderName: row.shopify_draft_order_name,
    customerEmail: row.customer_email,
    customerId: row.customer_id,
    subtotalCents: row.subtotal_cents,
    totalCents: row.total_cents,
    currencyCode: row.currency_code,
    lineItems: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
    discountCode: row.discount_code,
    discountAmountCents: row.discount_amount_cents,
    status: row.status as DraftOrder['status'],
    invoiceSentAt: row.invoice_sent_at,
    completedAt: row.completed_at,
    completedOrderId: row.completed_order_id,
    expiresAt: row.expires_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface RecoveryEmailRow {
  id: string
  abandoned_checkout_id: string
  sequence_number: number
  status: string
  incentive_code: string | null
  scheduled_at: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  trigger_run_id: string | null
  attempts: number
  last_error: string | null
  created_at: string
}

function mapRecoveryEmailRow(row: RecoveryEmailRow): RecoveryEmailQueueItem {
  return {
    id: row.id,
    abandonedCheckoutId: row.abandoned_checkout_id,
    sequenceNumber: row.sequence_number,
    status: row.status as RecoveryEmailQueueItem['status'],
    incentiveCode: row.incentive_code,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    openedAt: row.opened_at,
    clickedAt: row.clicked_at,
    triggerRunId: row.trigger_run_id,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
  }
}

// ============================================================
// Abandoned Checkouts CRUD
// ============================================================

export async function listAbandonedCheckouts(
  filters: AbandonedCheckoutFilters,
): Promise<{ checkouts: AbandonedCheckout[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.status) {
    paramIndex++
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
  }

  if (filters.search) {
    paramIndex++
    conditions.push(`(customer_email ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }

  if (filters.dateFrom) {
    paramIndex++
    conditions.push(`abandoned_at >= $${paramIndex}::timestamptz`)
    values.push(filters.dateFrom)
  }

  if (filters.dateTo) {
    paramIndex++
    conditions.push(`abandoned_at <= $${paramIndex}::timestamptz`)
    values.push(filters.dateTo)
  }

  if (filters.minValue !== undefined) {
    paramIndex++
    conditions.push(`cart_total_cents >= $${paramIndex}`)
    values.push(filters.minValue)
  }

  if (filters.maxValue !== undefined) {
    paramIndex++
    conditions.push(`cart_total_cents <= $${paramIndex}`)
    values.push(filters.maxValue)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortColumn = filters.sort || 'abandoned_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'
  const limit = filters.limit || 20
  const offset = ((filters.page || 1) - 1) * limit

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(limit, offset)

  const dataResult = await sql.query(
    `SELECT * FROM abandoned_checkouts
     ${whereClause}
     ORDER BY ${sortColumn} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM abandoned_checkouts ${whereClause}`,
    countValues,
  )

  return {
    checkouts: (dataResult.rows as AbandonedCheckoutRow[]).map(mapAbandonedCheckoutRow),
    total: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getAbandonedCheckout(id: string): Promise<AbandonedCheckout | null> {
  const result = await sql`
    SELECT * FROM abandoned_checkouts WHERE id = ${id}
  `
  if (result.rows.length === 0) return null
  return mapAbandonedCheckoutRow(result.rows[0] as AbandonedCheckoutRow)
}

export async function getAbandonedCheckoutByShopifyId(
  shopifyCheckoutId: string,
): Promise<AbandonedCheckout | null> {
  const result = await sql`
    SELECT * FROM abandoned_checkouts WHERE shopify_checkout_id = ${shopifyCheckoutId}
  `
  if (result.rows.length === 0) return null
  return mapAbandonedCheckoutRow(result.rows[0] as AbandonedCheckoutRow)
}

export async function upsertAbandonedCheckout(
  payload: ShopifyCheckoutWebhookPayload,
): Promise<AbandonedCheckout> {
  const shopifyCheckoutId = String(payload.id)
  const totalCents = Math.round(parseFloat(payload.total_price) * 100)

  const lineItems: AbandonedCheckoutLineItem[] = payload.line_items.map((item) => ({
    id: String(item.id),
    title: item.title,
    variantTitle: item.variant_title,
    quantity: item.quantity,
    price: Math.round(parseFloat(item.price) * 100),
    currency: payload.currency,
    imageUrl: item.image_url,
    sku: item.sku,
    productId: item.product_id ? String(item.product_id) : undefined,
    variantId: item.variant_id ? String(item.variant_id) : undefined,
  }))

  const customerName = payload.customer
    ? [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(' ')
    : null

  const result = await sql`
    INSERT INTO abandoned_checkouts (
      shopify_checkout_id,
      shopify_checkout_token,
      customer_email,
      customer_phone,
      customer_id,
      customer_name,
      cart_total_cents,
      currency_code,
      line_items,
      billing_address,
      shipping_address,
      recovery_url,
      abandoned_at
    ) VALUES (
      ${shopifyCheckoutId},
      ${payload.token},
      ${payload.email || payload.customer?.email || null},
      ${payload.phone || null},
      ${payload.customer?.id ? String(payload.customer.id) : null},
      ${customerName},
      ${totalCents},
      ${payload.currency},
      ${JSON.stringify(lineItems)},
      ${payload.billing_address ? JSON.stringify(payload.billing_address) : null},
      ${payload.shipping_address ? JSON.stringify(payload.shipping_address) : null},
      ${payload.abandoned_checkout_url || null},
      ${payload.created_at}
    )
    ON CONFLICT (shopify_checkout_id) DO UPDATE SET
      shopify_checkout_token = EXCLUDED.shopify_checkout_token,
      customer_email = EXCLUDED.customer_email,
      customer_phone = EXCLUDED.customer_phone,
      customer_id = EXCLUDED.customer_id,
      customer_name = EXCLUDED.customer_name,
      cart_total_cents = EXCLUDED.cart_total_cents,
      currency_code = EXCLUDED.currency_code,
      line_items = EXCLUDED.line_items,
      billing_address = EXCLUDED.billing_address,
      shipping_address = EXCLUDED.shipping_address,
      recovery_url = EXCLUDED.recovery_url,
      updated_at = NOW()
    RETURNING *
  `

  return mapAbandonedCheckoutRow(result.rows[0] as AbandonedCheckoutRow)
}

export async function markCheckoutRecovered(
  shopifyCheckoutId: string,
  orderId: string,
): Promise<AbandonedCheckout | null> {
  const result = await sql`
    UPDATE abandoned_checkouts
    SET status = 'recovered',
        recovered_at = NOW(),
        recovered_order_id = ${orderId}
    WHERE shopify_checkout_id = ${shopifyCheckoutId}
      AND status = 'abandoned'
    RETURNING *
  `

  if (result.rows.length === 0) return null
  return mapAbandonedCheckoutRow(result.rows[0] as AbandonedCheckoutRow)
}

export async function updateCheckoutStatus(
  id: string,
  status: AbandonedCheckoutStatus,
): Promise<AbandonedCheckout | null> {
  const result = await sql`
    UPDATE abandoned_checkouts
    SET status = ${status}
    WHERE id = ${id}
    RETURNING *
  `

  if (result.rows.length === 0) return null
  return mapAbandonedCheckoutRow(result.rows[0] as AbandonedCheckoutRow)
}

export async function incrementRecoveryEmailCount(id: string): Promise<void> {
  await sql`
    UPDATE abandoned_checkouts
    SET recovery_email_count = recovery_email_count + 1,
        last_email_sent_at = NOW()
    WHERE id = ${id}
  `
}

export async function expireOldCheckouts(daysOld: number): Promise<number> {
  const result = await sql`
    UPDATE abandoned_checkouts
    SET status = 'expired'
    WHERE status = 'abandoned'
      AND abandoned_at < NOW() - make_interval(days => ${daysOld})
    RETURNING id
  `
  return result.rows.length
}

// ============================================================
// Recovery Settings
// ============================================================

export async function getRecoverySettings(): Promise<TenantRecoverySettings | null> {
  const result = await sql`
    SELECT * FROM tenant_recovery_settings LIMIT 1
  `
  if (result.rows.length === 0) return null
  return mapRecoverySettingsRow(result.rows[0] as RecoverySettingsRow)
}

export async function updateRecoverySettings(
  updates: Partial<TenantRecoverySettings>,
): Promise<TenantRecoverySettings | null> {
  // Build dynamic update query
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (updates.enabled !== undefined) {
    paramIndex++
    setClauses.push(`enabled = $${paramIndex}`)
    values.push(updates.enabled)
  }
  if (updates.abandonmentTimeoutHours !== undefined) {
    paramIndex++
    setClauses.push(`abandonment_timeout_hours = $${paramIndex}`)
    values.push(updates.abandonmentTimeoutHours)
  }
  if (updates.maxRecoveryEmails !== undefined) {
    paramIndex++
    setClauses.push(`max_recovery_emails = $${paramIndex}`)
    values.push(updates.maxRecoveryEmails)
  }
  if (updates.sequence1DelayHours !== undefined) {
    paramIndex++
    setClauses.push(`sequence_1_delay_hours = $${paramIndex}`)
    values.push(updates.sequence1DelayHours)
  }
  if (updates.sequence2DelayHours !== undefined) {
    paramIndex++
    setClauses.push(`sequence_2_delay_hours = $${paramIndex}`)
    values.push(updates.sequence2DelayHours)
  }
  if (updates.sequence3DelayHours !== undefined) {
    paramIndex++
    setClauses.push(`sequence_3_delay_hours = $${paramIndex}`)
    values.push(updates.sequence3DelayHours)
  }
  if (updates.sequence1IncentiveCode !== undefined) {
    paramIndex++
    setClauses.push(`sequence_1_incentive_code = $${paramIndex}`)
    values.push(updates.sequence1IncentiveCode)
  }
  if (updates.sequence2IncentiveCode !== undefined) {
    paramIndex++
    setClauses.push(`sequence_2_incentive_code = $${paramIndex}`)
    values.push(updates.sequence2IncentiveCode)
  }
  if (updates.sequence3IncentiveCode !== undefined) {
    paramIndex++
    setClauses.push(`sequence_3_incentive_code = $${paramIndex}`)
    values.push(updates.sequence3IncentiveCode)
  }
  if (updates.sequence1Enabled !== undefined) {
    paramIndex++
    setClauses.push(`sequence_1_enabled = $${paramIndex}`)
    values.push(updates.sequence1Enabled)
  }
  if (updates.sequence2Enabled !== undefined) {
    paramIndex++
    setClauses.push(`sequence_2_enabled = $${paramIndex}`)
    values.push(updates.sequence2Enabled)
  }
  if (updates.sequence3Enabled !== undefined) {
    paramIndex++
    setClauses.push(`sequence_3_enabled = $${paramIndex}`)
    values.push(updates.sequence3Enabled)
  }
  if (updates.checkoutExpiryDays !== undefined) {
    paramIndex++
    setClauses.push(`checkout_expiry_days = $${paramIndex}`)
    values.push(updates.checkoutExpiryDays)
  }
  if (updates.highValueThresholdCents !== undefined) {
    paramIndex++
    setClauses.push(`high_value_threshold_cents = $${paramIndex}`)
    values.push(updates.highValueThresholdCents)
  }

  if (setClauses.length === 0) {
    return getRecoverySettings()
  }

  const result = await sql.query(
    `UPDATE tenant_recovery_settings
     SET ${setClauses.join(', ')}
     RETURNING *`,
    values,
  )

  if (result.rows.length === 0) return null
  return mapRecoverySettingsRow(result.rows[0] as RecoverySettingsRow)
}

// ============================================================
// Recovery Email Queue
// ============================================================

export async function scheduleRecoveryEmail(
  checkoutId: string,
  sequenceNumber: number,
  scheduledAt: Date,
  incentiveCode?: string,
): Promise<RecoveryEmailQueueItem> {
  const result = await sql`
    INSERT INTO recovery_email_queue (
      abandoned_checkout_id,
      sequence_number,
      scheduled_at,
      incentive_code
    ) VALUES (
      ${checkoutId},
      ${sequenceNumber},
      ${scheduledAt.toISOString()},
      ${incentiveCode || null}
    )
    ON CONFLICT (abandoned_checkout_id, sequence_number) DO UPDATE SET
      scheduled_at = EXCLUDED.scheduled_at,
      incentive_code = EXCLUDED.incentive_code,
      status = 'scheduled',
      attempts = 0,
      last_error = NULL
    RETURNING *
  `

  return mapRecoveryEmailRow(result.rows[0] as RecoveryEmailRow)
}

export async function getScheduledEmails(limit: number = 100): Promise<RecoveryEmailQueueItem[]> {
  const result = await sql`
    SELECT req.*
    FROM recovery_email_queue req
    JOIN abandoned_checkouts ac ON ac.id = req.abandoned_checkout_id
    WHERE req.status = 'scheduled'
      AND req.scheduled_at <= NOW()
      AND ac.status = 'abandoned'
    ORDER BY req.scheduled_at ASC
    LIMIT ${limit}
  `
  return (result.rows as RecoveryEmailRow[]).map(mapRecoveryEmailRow)
}

export async function updateEmailStatus(
  id: string,
  status: RecoveryEmailQueueItem['status'],
  error?: string,
): Promise<void> {
  if (status === 'sent') {
    await sql`
      UPDATE recovery_email_queue
      SET status = ${status}, sent_at = NOW(), attempts = attempts + 1
      WHERE id = ${id}
    `
  } else if (status === 'failed') {
    await sql`
      UPDATE recovery_email_queue
      SET status = ${status}, last_error = ${error || null}, attempts = attempts + 1
      WHERE id = ${id}
    `
  } else {
    await sql`
      UPDATE recovery_email_queue
      SET status = ${status}
      WHERE id = ${id}
    `
  }
}

export async function markEmailOpened(id: string): Promise<void> {
  await sql`
    UPDATE recovery_email_queue
    SET opened_at = NOW()
    WHERE id = ${id} AND opened_at IS NULL
  `
}

export async function markEmailClicked(id: string): Promise<void> {
  await sql`
    UPDATE recovery_email_queue
    SET clicked_at = NOW()
    WHERE id = ${id} AND clicked_at IS NULL
  `
}

export async function cancelPendingEmails(checkoutId: string): Promise<void> {
  await sql`
    UPDATE recovery_email_queue
    SET status = 'cancelled'
    WHERE abandoned_checkout_id = ${checkoutId}
      AND status = 'scheduled'
  `
}

export async function getEmailsForCheckout(checkoutId: string): Promise<RecoveryEmailQueueItem[]> {
  const result = await sql`
    SELECT * FROM recovery_email_queue
    WHERE abandoned_checkout_id = ${checkoutId}
    ORDER BY sequence_number ASC
  `
  return (result.rows as RecoveryEmailRow[]).map(mapRecoveryEmailRow)
}

// ============================================================
// Draft Orders
// ============================================================

export async function createDraftOrder(data: {
  abandonedCheckoutId: string | null
  shopifyDraftOrderId: string
  shopifyDraftOrderName?: string
  customerEmail?: string
  customerId?: string
  subtotalCents: number
  totalCents: number
  currencyCode: string
  lineItems: AbandonedCheckoutLineItem[]
  discountCode?: string
  discountAmountCents?: number
  notes?: string
  expiresAt?: Date
}): Promise<DraftOrder> {
  const result = await sql`
    INSERT INTO draft_orders (
      abandoned_checkout_id,
      shopify_draft_order_id,
      shopify_draft_order_name,
      customer_email,
      customer_id,
      subtotal_cents,
      total_cents,
      currency_code,
      line_items,
      discount_code,
      discount_amount_cents,
      notes,
      expires_at
    ) VALUES (
      ${data.abandonedCheckoutId},
      ${data.shopifyDraftOrderId},
      ${data.shopifyDraftOrderName || null},
      ${data.customerEmail || null},
      ${data.customerId || null},
      ${data.subtotalCents},
      ${data.totalCents},
      ${data.currencyCode},
      ${JSON.stringify(data.lineItems)},
      ${data.discountCode || null},
      ${data.discountAmountCents || 0},
      ${data.notes || null},
      ${data.expiresAt?.toISOString() || null}
    )
    RETURNING *
  `

  return mapDraftOrderRow(result.rows[0] as DraftOrderRow)
}

export async function getDraftOrder(id: string): Promise<DraftOrder | null> {
  const result = await sql`
    SELECT * FROM draft_orders WHERE id = ${id}
  `
  if (result.rows.length === 0) return null
  return mapDraftOrderRow(result.rows[0] as DraftOrderRow)
}

export async function updateDraftOrderStatus(
  id: string,
  status: DraftOrder['status'],
  completedOrderId?: string,
): Promise<DraftOrder | null> {
  if (status === 'completed' && completedOrderId) {
    const result = await sql`
      UPDATE draft_orders
      SET status = ${status},
          completed_at = NOW(),
          completed_order_id = ${completedOrderId}
      WHERE id = ${id}
      RETURNING *
    `
    if (result.rows.length === 0) return null
    return mapDraftOrderRow(result.rows[0] as DraftOrderRow)
  }

  if (status === 'invoice_sent') {
    const result = await sql`
      UPDATE draft_orders
      SET status = ${status}, invoice_sent_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (result.rows.length === 0) return null
    return mapDraftOrderRow(result.rows[0] as DraftOrderRow)
  }

  const result = await sql`
    UPDATE draft_orders
    SET status = ${status}
    WHERE id = ${id}
    RETURNING *
  `
  if (result.rows.length === 0) return null
  return mapDraftOrderRow(result.rows[0] as DraftOrderRow)
}

// ============================================================
// Analytics & Stats
// ============================================================

export async function getRecoveryStats(): Promise<RecoveryStatsResponse> {
  const result = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'abandoned') as total_abandoned,
      COALESCE(SUM(cart_total_cents) FILTER (WHERE status = 'abandoned'), 0) as value_at_risk,
      COUNT(*) FILTER (WHERE status = 'recovered') as total_recovered,
      COALESCE(SUM(cart_total_cents) FILTER (WHERE status = 'recovered'), 0) as recovered_value,
      COALESCE(AVG(cart_total_cents), 0) as avg_cart_value,
      COUNT(*) FILTER (WHERE status = 'abandoned' AND abandoned_at >= CURRENT_DATE) as today_abandoned,
      COUNT(*) FILTER (WHERE status = 'recovered' AND recovered_at >= CURRENT_DATE) as today_recovered
    FROM abandoned_checkouts
  `

  const row = result.rows[0] as {
    total_abandoned: string
    value_at_risk: string
    total_recovered: string
    recovered_value: string
    avg_cart_value: string
    today_abandoned: string
    today_recovered: string
  }

  const totalAbandoned = Number(row.total_abandoned) + Number(row.total_recovered)
  const totalRecovered = Number(row.total_recovered)
  const recoveryRate = totalAbandoned > 0 ? totalRecovered / totalAbandoned : 0

  return {
    totalAbandoned: totalAbandoned,
    totalAbandonedValue: Number(row.value_at_risk) + Number(row.recovered_value),
    totalRecovered: totalRecovered,
    totalRecoveredValue: Number(row.recovered_value),
    recoveryRate: recoveryRate,
    valueAtRisk: Number(row.value_at_risk),
    averageCartValue: Number(row.avg_cart_value),
    todayAbandoned: Number(row.today_abandoned),
    todayRecovered: Number(row.today_recovered),
  }
}

export async function getRecoveryAnalytics(
  startDate: Date,
  endDate: Date,
): Promise<RecoveryAnalyticsDaily[]> {
  const result = await sql`
    SELECT * FROM recovery_analytics_daily
    WHERE date >= ${startDate.toISOString()}::date
      AND date <= ${endDate.toISOString()}::date
    ORDER BY date DESC
  `

  interface AnalyticsRow {
    id: string
    date: string
    total_abandoned: number
    total_abandoned_value_cents: string
    total_recovered: number
    total_recovered_value_cents: string
    total_expired: number
    emails_sent: number
    emails_opened: number
    emails_clicked: number
    draft_orders_created: number
    draft_orders_completed: number
    sequence_1_sent: number
    sequence_1_recovered: number
    sequence_2_sent: number
    sequence_2_recovered: number
    sequence_3_sent: number
    sequence_3_recovered: number
    created_at: string
    updated_at: string
  }

  return (result.rows as AnalyticsRow[]).map((row) => ({
    id: row.id,
    date: row.date,
    totalAbandoned: row.total_abandoned,
    totalAbandonedValueCents: Number(row.total_abandoned_value_cents),
    totalRecovered: row.total_recovered,
    totalRecoveredValueCents: Number(row.total_recovered_value_cents),
    totalExpired: row.total_expired,
    emailsSent: row.emails_sent,
    emailsOpened: row.emails_opened,
    emailsClicked: row.emails_clicked,
    draftOrdersCreated: row.draft_orders_created,
    draftOrdersCompleted: row.draft_orders_completed,
    sequence1Sent: row.sequence_1_sent,
    sequence1Recovered: row.sequence_1_recovered,
    sequence2Sent: row.sequence_2_sent,
    sequence2Recovered: row.sequence_2_recovered,
    sequence3Sent: row.sequence_3_sent,
    sequence3Recovered: row.sequence_3_recovered,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function updateDailyAnalytics(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  await sql`
    INSERT INTO recovery_analytics_daily (date)
    VALUES (${today}::date)
    ON CONFLICT (date) DO NOTHING
  `

  // Update stats from today's data
  await sql`
    UPDATE recovery_analytics_daily
    SET
      total_abandoned = (
        SELECT COUNT(*) FROM abandoned_checkouts
        WHERE abandoned_at::date = ${today}::date
      ),
      total_abandoned_value_cents = (
        SELECT COALESCE(SUM(cart_total_cents), 0) FROM abandoned_checkouts
        WHERE abandoned_at::date = ${today}::date
      ),
      total_recovered = (
        SELECT COUNT(*) FROM abandoned_checkouts
        WHERE recovered_at::date = ${today}::date
      ),
      total_recovered_value_cents = (
        SELECT COALESCE(SUM(cart_total_cents), 0) FROM abandoned_checkouts
        WHERE recovered_at::date = ${today}::date
      ),
      emails_sent = (
        SELECT COUNT(*) FROM recovery_email_queue
        WHERE sent_at::date = ${today}::date AND status = 'sent'
      ),
      updated_at = NOW()
    WHERE date = ${today}::date
  `
}

// ============================================================
// Checkouts pending recovery
// ============================================================

export async function getCheckoutsPendingRecovery(
  abandonmentTimeoutHours: number,
  limit: number = 100,
): Promise<AbandonedCheckout[]> {
  const result = await sql`
    SELECT * FROM abandoned_checkouts
    WHERE status = 'abandoned'
      AND recovery_email_count = 0
      AND abandoned_at <= NOW() - make_interval(hours => ${abandonmentTimeoutHours})
      AND customer_email IS NOT NULL
    ORDER BY abandoned_at ASC
    LIMIT ${limit}
  `
  return (result.rows as AbandonedCheckoutRow[]).map(mapAbandonedCheckoutRow)
}
