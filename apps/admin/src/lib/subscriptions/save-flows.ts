/**
 * Subscription Save Flows Service
 *
 * Manages retention flows for subscription cancellation prevention and win-back.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk/db'

import type { SaveFlow, SaveFlowType, SaveAttempt, SaveAttemptOutcome } from './types'

/**
 * List all save flows
 */
export async function listSaveFlows(tenantSlug: string): Promise<SaveFlow[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_save_flows
      ORDER BY priority DESC, created_at DESC
    `

    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      flowType: row.flow_type as SaveFlowType,
      triggerConditions: row.trigger_conditions as SaveFlow['triggerConditions'],
      steps: (row.steps as SaveFlow['steps']) || [],
      offers: (row.offers as SaveFlow['offers']) || [],
      isEnabled: row.is_enabled as boolean,
      priority: row.priority as number,
      totalTriggered: row.total_triggered as number,
      totalSaved: row.total_saved as number,
      revenueSavedCents: row.revenue_saved_cents as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }))
  })
}

/**
 * Get a single save flow by ID
 */
export async function getSaveFlow(
  tenantSlug: string,
  flowId: string
): Promise<SaveFlow | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_save_flows WHERE id = ${flowId}
    `
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      flowType: row.flow_type as SaveFlowType,
      triggerConditions: row.trigger_conditions as SaveFlow['triggerConditions'],
      steps: (row.steps as SaveFlow['steps']) || [],
      offers: (row.offers as SaveFlow['offers']) || [],
      isEnabled: row.is_enabled as boolean,
      priority: row.priority as number,
      totalTriggered: row.total_triggered as number,
      totalSaved: row.total_saved as number,
      revenueSavedCents: row.revenue_saved_cents as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

/**
 * Create a new save flow
 */
export async function createSaveFlow(
  tenantSlug: string,
  data: {
    name: string
    description?: string
    flowType: SaveFlowType
    triggerConditions: SaveFlow['triggerConditions']
    steps: SaveFlow['steps']
    offers: SaveFlow['offers']
    isEnabled?: boolean
    priority?: number
  }
): Promise<SaveFlow> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO subscription_save_flows (
        name, description, flow_type, trigger_conditions,
        steps, offers, is_enabled, priority
      )
      VALUES (
        ${data.name},
        ${data.description || null},
        ${data.flowType}::save_flow_type,
        ${JSON.stringify(data.triggerConditions)},
        ${JSON.stringify(data.steps)},
        ${JSON.stringify(data.offers)},
        ${data.isEnabled ?? true},
        ${data.priority ?? 0}
      )
      RETURNING *
    `

    const row = result.rows[0]
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      flowType: row.flow_type as SaveFlowType,
      triggerConditions: row.trigger_conditions as SaveFlow['triggerConditions'],
      steps: (row.steps as SaveFlow['steps']) || [],
      offers: (row.offers as SaveFlow['offers']) || [],
      isEnabled: row.is_enabled as boolean,
      priority: row.priority as number,
      totalTriggered: row.total_triggered as number,
      totalSaved: row.total_saved as number,
      revenueSavedCents: row.revenue_saved_cents as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

/**
 * Update a save flow
 */
export async function updateSaveFlow(
  tenantSlug: string,
  flowId: string,
  data: Partial<{
    name: string
    description: string
    triggerConditions: SaveFlow['triggerConditions']
    steps: SaveFlow['steps']
    offers: SaveFlow['offers']
    isEnabled: boolean
    priority: number
  }>
): Promise<SaveFlow | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (data.name !== undefined) {
      paramIndex++
      updates.push(`name = $${paramIndex}`)
      values.push(data.name)
    }

    if (data.description !== undefined) {
      paramIndex++
      updates.push(`description = $${paramIndex}`)
      values.push(data.description)
    }

    if (data.triggerConditions !== undefined) {
      paramIndex++
      updates.push(`trigger_conditions = $${paramIndex}`)
      values.push(JSON.stringify(data.triggerConditions))
    }

    if (data.steps !== undefined) {
      paramIndex++
      updates.push(`steps = $${paramIndex}`)
      values.push(JSON.stringify(data.steps))
    }

    if (data.offers !== undefined) {
      paramIndex++
      updates.push(`offers = $${paramIndex}`)
      values.push(JSON.stringify(data.offers))
    }

    if (data.isEnabled !== undefined) {
      paramIndex++
      updates.push(`is_enabled = $${paramIndex}`)
      values.push(data.isEnabled)
    }

    if (data.priority !== undefined) {
      paramIndex++
      updates.push(`priority = $${paramIndex}`)
      values.push(data.priority)
    }

    if (updates.length === 0) {
      return getSaveFlow(tenantSlug, flowId)
    }

    paramIndex++
    values.push(flowId)

    const result = await sql.query(
      `UPDATE subscription_save_flows
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      flowType: row.flow_type as SaveFlowType,
      triggerConditions: row.trigger_conditions as SaveFlow['triggerConditions'],
      steps: (row.steps as SaveFlow['steps']) || [],
      offers: (row.offers as SaveFlow['offers']) || [],
      isEnabled: row.is_enabled as boolean,
      priority: row.priority as number,
      totalTriggered: row.total_triggered as number,
      totalSaved: row.total_saved as number,
      revenueSavedCents: row.revenue_saved_cents as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  })
}

/**
 * Delete a save flow
 */
export async function deleteSaveFlow(
  tenantSlug: string,
  flowId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM subscription_save_flows WHERE id = ${flowId}
    `
    return (result.rowCount || 0) > 0
  })
}

/**
 * Toggle save flow enabled status
 */
export async function toggleSaveFlow(
  tenantSlug: string,
  flowId: string,
  enabled: boolean
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscription_save_flows
      SET is_enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${flowId}
    `
  })
}

/**
 * Create a save attempt record
 */
export async function createSaveAttempt(
  tenantSlug: string,
  subscriptionId: string,
  flowId: string
): Promise<SaveAttempt> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO subscription_save_attempts (subscription_id, flow_id)
      VALUES (${subscriptionId}, ${flowId})
      RETURNING *
    `

    // Update flow triggered count
    await sql`
      UPDATE subscription_save_flows
      SET total_triggered = total_triggered + 1
      WHERE id = ${flowId}
    `

    const row = result.rows[0]
    return {
      id: row.id as string,
      subscriptionId: row.subscription_id as string,
      flowId: row.flow_id as string,
      outcome: row.outcome as SaveAttemptOutcome,
      stepsCompleted: (row.steps_completed as string[]) || [],
      offerPresented: row.offer_presented as string | null,
      offerAccepted: row.offer_accepted as string | null,
      cancelReason: row.cancel_reason as string | null,
      revenueSavedCents: row.revenue_saved_cents as number | null,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | null,
      createdAt: row.created_at as string,
    }
  })
}

/**
 * Complete a save attempt
 */
export async function completeSaveAttempt(
  tenantSlug: string,
  attemptId: string,
  data: {
    outcome: SaveAttemptOutcome
    offerAccepted?: string
    cancelReason?: string
    revenueSavedCents?: number
  }
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE subscription_save_attempts
      SET
        outcome = ${data.outcome}::save_attempt_outcome,
        offer_accepted = ${data.offerAccepted || null},
        cancel_reason = ${data.cancelReason || null},
        revenue_saved_cents = ${data.revenueSavedCents || null},
        completed_at = NOW()
      WHERE id = ${attemptId}
      RETURNING flow_id
    `

    // Update flow stats if saved
    if (data.outcome === 'saved' && result.rows.length > 0) {
      const flowId = result.rows[0].flow_id as string
      await sql`
        UPDATE subscription_save_flows
        SET
          total_saved = total_saved + 1,
          revenue_saved_cents = revenue_saved_cents + ${data.revenueSavedCents || 0}
        WHERE id = ${flowId}
      `
    }
  })
}

/**
 * Get save flow analytics
 */
export async function getSaveFlowAnalytics(
  tenantSlug: string
): Promise<{
  totalFlows: number
  activeFlows: number
  totalTriggered: number
  totalSaved: number
  saveRate: number
  totalRevenueSaved: number
  byFlow: {
    flowId: string
    flowName: string
    flowType: SaveFlowType
    triggered: number
    saved: number
    saveRate: number
    revenueSaved: number
  }[]
  byOffer: {
    offer: string
    accepted: number
    percentage: number
  }[]
}> {
  return withTenant(tenantSlug, async () => {
    // Get flow stats
    const flowsResult = await sql`
      SELECT
        id, name, flow_type,
        total_triggered, total_saved, revenue_saved_cents
      FROM subscription_save_flows
      ORDER BY total_triggered DESC
    `

    let totalTriggered = 0
    let totalSaved = 0
    let totalRevenueSaved = 0

    const byFlow = flowsResult.rows.map((row) => {
      const triggered = Number(row.total_triggered || 0)
      const saved = Number(row.total_saved || 0)
      const revenueSaved = Number(row.revenue_saved_cents || 0)

      totalTriggered += triggered
      totalSaved += saved
      totalRevenueSaved += revenueSaved

      return {
        flowId: row.id as string,
        flowName: row.name as string,
        flowType: row.flow_type as SaveFlowType,
        triggered,
        saved,
        saveRate: triggered > 0 ? (saved / triggered) * 100 : 0,
        revenueSaved,
      }
    })

    // Get offer acceptance stats
    const offersResult = await sql`
      SELECT
        offer_accepted as offer,
        COUNT(*) as accepted
      FROM subscription_save_attempts
      WHERE offer_accepted IS NOT NULL
      GROUP BY offer_accepted
      ORDER BY accepted DESC
    `

    const totalOfferAccepted = offersResult.rows.reduce(
      (sum, row) => sum + Number(row.accepted),
      0
    )

    const byOffer = offersResult.rows.map((row) => ({
      offer: row.offer as string,
      accepted: Number(row.accepted || 0),
      percentage: totalOfferAccepted > 0
        ? (Number(row.accepted) / totalOfferAccepted) * 100
        : 0,
    }))

    // Count active flows
    const activeResult = await sql`
      SELECT COUNT(*) as count FROM subscription_save_flows WHERE is_enabled = true
    `
    const activeFlows = Number(activeResult.rows[0]?.count || 0)

    return {
      totalFlows: flowsResult.rows.length,
      activeFlows,
      totalTriggered,
      totalSaved,
      saveRate: totalTriggered > 0 ? (totalSaved / totalTriggered) * 100 : 0,
      totalRevenueSaved,
      byFlow,
      byOffer,
    }
  })
}
