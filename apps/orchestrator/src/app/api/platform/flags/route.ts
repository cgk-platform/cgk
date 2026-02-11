/**
 * Feature Flags API - List and Create
 *
 * GET /api/platform/flags - List all flags with filtering
 * POST /api/platform/flags - Create a new flag
 */

import { requireAuth } from '@cgk/auth'
import {
  createFlag,
  getCategories,
  getFlags,
  isValidFlagKey,
  type CreateFlagInput,
  type FlagListFilters,
} from '@cgk/feature-flags'
import { invalidateAllFlags } from '@cgk/feature-flags/server'
import { createLogger } from '@cgk/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'flags-api' },
})

/**
 * GET /api/platform/flags
 *
 * List all feature flags with optional filtering
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)

    // Only super admins can manage flags
    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const filters: FlagListFilters = {
      category: url.searchParams.get('category') || undefined,
      type: (url.searchParams.get('type') as FlagListFilters['type']) || undefined,
      status: (url.searchParams.get('status') as FlagListFilters['status']) || undefined,
      search: url.searchParams.get('search') || undefined,
    }

    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)

    const [result, categories] = await Promise.all([
      getFlags(filters, { page, limit }),
      getCategories(),
    ])

    logger.info('Flags listed', {
      userId: auth.userId,
      filters,
      total: result.total,
    })

    return Response.json({
      ...result,
      categories,
    })
  } catch (error) {
    logger.error('Failed to list flags', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/platform/flags
 *
 * Create a new feature flag
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as CreateFlagInput

    // Validate flag key
    if (!body.key || !isValidFlagKey(body.key)) {
      return Response.json(
        {
          error: 'Invalid flag key. Must match pattern: ^[a-z][a-z0-9._]+$',
        },
        { status: 400 }
      )
    }

    if (!body.name) {
      return Response.json({ error: 'Flag name is required' }, { status: 400 })
    }

    if (!body.type) {
      return Response.json({ error: 'Flag type is required' }, { status: 400 })
    }

    const flag = await createFlag(body, auth.userId)

    // Invalidate cache
    await invalidateAllFlags()

    logger.info('Flag created', {
      userId: auth.userId,
      flagKey: flag.key,
    })

    return Response.json({ flag }, { status: 201 })
  } catch (error) {
    if ((error as Error).message?.includes('duplicate key')) {
      return Response.json({ error: 'Flag key already exists' }, { status: 409 })
    }

    logger.error('Failed to create flag', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
