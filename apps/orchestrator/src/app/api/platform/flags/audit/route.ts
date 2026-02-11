/**
 * Flag Audit Log API
 *
 * GET /api/platform/flags/audit - Get all audit entries
 */

import { requireAuth } from '@cgk/auth'
import { getAllAuditEntries } from '@cgk/feature-flags'
import { createLogger } from '@cgk/logging'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const logger = createLogger({
  meta: { service: 'orchestrator', component: 'flags-audit-api' },
})

/**
 * GET /api/platform/flags/audit
 *
 * Get all audit entries with optional filtering
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)

    if (auth.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const action = url.searchParams.get('action') || undefined

    const result = await getAllAuditEntries(limit, offset, action)

    logger.debug('Audit log queried', {
      userId: auth.userId,
      limit,
      offset,
      action,
      total: result.total,
    })

    return Response.json(result)
  } catch (error) {
    logger.error('Failed to get audit log', error as Error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
