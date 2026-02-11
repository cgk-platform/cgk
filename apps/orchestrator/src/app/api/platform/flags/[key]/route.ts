/**
 * Feature Flag API - Single Flag Operations
 *
 * GET /api/platform/flags/[key] - Get flag details
 * PATCH /api/platform/flags/[key] - Update flag
 * DELETE /api/platform/flags/[key] - Delete flag
 */

import { requireAuth } from '@cgk/auth'
import {
  deleteFlag,
  getAuditLog,
  getFlagByKey,
  getOverridesForFlag,
  killFlag,
  updateFlag,
  type UpdateFlagInput,
} from '@cgk/feature-flags'
import { invalidateFlag } from '@cgk/feature-flags/server'
import { createLogger } from '@cgk/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'flags-api' },
})

interface RouteContext {
  params: Promise<{ key: string }>
}

/**
 * GET /api/platform/flags/[key]
 *
 * Get flag details including overrides and audit log
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params

    const [flag, overrides, auditLog] = await Promise.all([
      getFlagByKey(key),
      getOverridesForFlag(key),
      getAuditLog(key, 20),
    ])

    if (!flag) {
      return Response.json({ error: 'Flag not found' }, { status: 404 })
    }

    return Response.json({
      flag,
      overrides,
      auditLog,
    })
  } catch (error) {
    logger.error('Failed to get flag', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/platform/flags/[key]
 *
 * Update a flag or trigger kill switch
 */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params
    const body = (await req.json()) as UpdateFlagInput & {
      killSwitch?: boolean
      reason?: string
    }

    // Check if this is a kill switch request
    if (body.killSwitch) {
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      const flag = await killFlag(key, auth.userId, body.reason, ipAddress || undefined)

      if (!flag) {
        return Response.json({ error: 'Flag not found' }, { status: 404 })
      }

      await invalidateFlag(key)

      logger.warn('Kill switch activated', {
        userId: auth.userId,
        flagKey: key,
        reason: body.reason,
      })

      return Response.json({ flag, killSwitch: true })
    }

    // Regular update
    const flag = await updateFlag(key, body, auth.userId, body.reason)

    if (!flag) {
      return Response.json({ error: 'Flag not found' }, { status: 404 })
    }

    await invalidateFlag(key)

    logger.info('Flag updated', {
      userId: auth.userId,
      flagKey: key,
    })

    return Response.json({ flag })
  } catch (error) {
    logger.error('Failed to update flag', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/flags/[key]
 *
 * Delete a flag (hard delete)
 */
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params
    const url = new URL(req.url)
    const reason = url.searchParams.get('reason') || undefined

    const deleted = await deleteFlag(key, auth.userId, reason)

    if (!deleted) {
      return Response.json({ error: 'Flag not found' }, { status: 404 })
    }

    await invalidateFlag(key)

    logger.info('Flag deleted', {
      userId: auth.userId,
      flagKey: key,
      reason,
    })

    return Response.json({ deleted: true })
  } catch (error) {
    logger.error('Failed to delete flag', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
