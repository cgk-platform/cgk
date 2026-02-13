/**
 * Individual Shipping A/B Test API
 *
 * GET - Get test details
 * PATCH - Update test
 * DELETE - Delete test
 */

import { getTenantContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Get shipping test details with variants
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  return withTenant(tenantId, async () => {
    const testResult = await sql`
      SELECT * FROM ab_tests
      WHERE id = ${id} AND test_type = 'shipping'
    `

    if (testResult.rows.length === 0) {
      return Response.json({ error: 'Test not found' }, { status: 404 })
    }

    const variantsResult = await sql`
      SELECT * FROM ab_variants
      WHERE test_id = ${id}
      ORDER BY is_control DESC, created_at ASC
    `

    // Get visitor count
    const visitorResult = await sql`
      SELECT COUNT(DISTINCT visitor_id) as count
      FROM ab_visitors
      WHERE test_id = ${id}
    `

    // Get order count
    const orderResult = await sql`
      SELECT COUNT(*) as count
      FROM ab_shipping_attributions
      WHERE test_id = ${id}
    `

    return Response.json({
      test: testResult.rows[0],
      variants: variantsResult.rows,
      stats: {
        visitors: Number(visitorResult.rows[0]?.count) || 0,
        orders: Number(orderResult.rows[0]?.count) || 0,
      },
    })
  })
}

/**
 * Update shipping test
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = await req.json()
  const now = new Date()

  return withTenant(tenantId, async () => {
    // Check test exists
    const existingResult = await sql`
      SELECT * FROM ab_tests
      WHERE id = ${id} AND test_type = 'shipping'
    `

    if (existingResult.rows.length === 0) {
      return Response.json({ error: 'Test not found' }, { status: 404 })
    }

    const existing = existingResult.rows[0]

    // Only allow status changes and some metadata updates
    const allowedUpdates = ['name', 'description', 'status', 'confidenceLevel']
    const updates: Record<string, unknown> = {}

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    // Handle status transitions
    if (updates.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused', 'completed'],
        paused: ['running', 'completed'],
        completed: [],
      }

      const currentStatus = (existing as { status: string }).status
      const newStatus = updates.status as string

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return Response.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        )
      }

      // Set started_at when going to running
      if (newStatus === 'running' && !(existing as { started_at?: unknown }).started_at) {
        updates.startedAt = now
      }

      // Set ended_at when completing
      if (newStatus === 'completed') {
        updates.endedAt = now
      }
    }

    // Build update query dynamically
    const updateFields: string[] = ['updated_at = $1']
    const updateValues: unknown[] = [now]
    let paramIndex = 2

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      status: 'status',
      confidenceLevel: 'confidence_level',
      startedAt: 'started_at',
      endedAt: 'ended_at',
    }

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key]
      if (dbField) {
        updateFields.push(`${dbField} = $${paramIndex}`)
        updateValues.push(value)
        paramIndex++
      }
    }

    updateValues.push(id)

    const updateQuery = `
      UPDATE ab_tests
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(updateQuery, updateValues)

    return Response.json({ test: result.rows[0] })
  })
}

/**
 * Delete shipping test
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  return withTenant(tenantId, async () => {
    // Check test exists and is not running
    const existingResult = await sql`
      SELECT * FROM ab_tests
      WHERE id = ${id} AND test_type = 'shipping'
    `

    if (existingResult.rows.length === 0) {
      return Response.json({ error: 'Test not found' }, { status: 404 })
    }

    const existing = existingResult.rows[0]

    if ((existing as { status: string }).status === 'running') {
      return Response.json(
        { error: 'Cannot delete a running test. Stop it first.' },
        { status: 400 }
      )
    }

    // Delete in order: attributions -> events -> visitors -> variants -> test
    await sql`DELETE FROM ab_shipping_attributions WHERE test_id = ${id}`
    await sql`DELETE FROM ab_events WHERE test_id = ${id}`
    await sql`DELETE FROM ab_visitors WHERE test_id = ${id}`
    await sql`DELETE FROM ab_variants WHERE test_id = ${id}`
    await sql`DELETE FROM ab_tests WHERE id = ${id}`

    return Response.json({ success: true })
  })
}
