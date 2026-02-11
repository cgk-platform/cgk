/**
 * Flag Overrides API
 *
 * GET /api/platform/flags/[key]/overrides - List overrides
 * POST /api/platform/flags/[key]/overrides - Create override
 * DELETE /api/platform/flags/[key]/overrides/[id] - Delete override
 */

import { requireAuth } from '@cgk/auth'
import type { CreateOverrideInput } from '@cgk/feature-flags'
import {
  createOverride,
  deleteOverride,
  getFlagByKey,
  getOverridesForFlag,
  invalidateFlag,
} from '@cgk/feature-flags/server'
import { createLogger } from '@cgk/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'flags-overrides-api' },
})

interface RouteContext {
  params: Promise<{ key: string }>
}

/**
 * GET /api/platform/flags/[key]/overrides
 *
 * List all overrides for a flag
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params

    const flag = await getFlagByKey(key)
    if (!flag) {
      return Response.json({ error: 'Flag not found' }, { status: 404 })
    }

    const overrides = await getOverridesForFlag(key)

    return Response.json({ overrides })
  } catch (error) {
    logger.error('Failed to list overrides', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/platform/flags/[key]/overrides
 *
 * Create a new override for a flag
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params
    const body = (await req.json()) as Omit<CreateOverrideInput, 'flagKey'>

    // Validate input
    if (!body.tenantId && !body.userId) {
      return Response.json(
        { error: 'Either tenantId or userId is required' },
        { status: 400 }
      )
    }

    if (body.value === undefined) {
      return Response.json({ error: 'Override value is required' }, { status: 400 })
    }

    const override = await createOverride(
      {
        flagKey: key,
        ...body,
      },
      auth.userId
    )

    await invalidateFlag(key)

    logger.info('Override created', {
      userId: auth.userId,
      flagKey: key,
      overrideId: override.id,
      targetTenant: body.tenantId,
      targetUser: body.userId,
    })

    return Response.json({ override }, { status: 201 })
  } catch (error) {
    if ((error as Error).message?.includes('not found')) {
      return Response.json({ error: 'Flag not found' }, { status: 404 })
    }

    if ((error as Error).message?.includes('duplicate')) {
      return Response.json(
        { error: 'Override already exists for this target' },
        { status: 409 }
      )
    }

    logger.error('Failed to create override', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/platform/flags/[key]/overrides
 *
 * Delete an override by ID (passed as query param)
 */
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key } = await context.params
    const url = new URL(req.url)
    const overrideId = url.searchParams.get('id')
    const reason = url.searchParams.get('reason') || undefined

    if (!overrideId) {
      return Response.json({ error: 'Override ID is required' }, { status: 400 })
    }

    const deleted = await deleteOverride(overrideId, auth.userId, reason)

    if (!deleted) {
      return Response.json({ error: 'Override not found' }, { status: 404 })
    }

    await invalidateFlag(key)

    logger.info('Override deleted', {
      userId: auth.userId,
      flagKey: key,
      overrideId,
      reason,
    })

    return Response.json({ deleted: true })
  } catch (error) {
    logger.error('Failed to delete override', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
