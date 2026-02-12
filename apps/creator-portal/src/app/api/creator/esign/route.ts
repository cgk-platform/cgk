/**
 * Creator E-Signature API Route
 *
 * GET /api/creator/esign - List signing requests for creator
 */

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getPendingSigningRequests, getSignedDocuments } from '@/lib/esign'

export const dynamic = 'force-dynamic'

/**
 * List signing requests (pending and completed)
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status') // 'pending' | 'signed' | 'all'

    // Get active brand membership
    const activeMembership = context.memberships.find((m) => m.status === 'active')
    if (!activeMembership) {
      return Response.json({ error: 'No active brand membership' }, { status: 403 })
    }

    const tenantSlug = activeMembership.brandSlug

    const results: {
      pending: Awaited<ReturnType<typeof getPendingSigningRequests>>
      signed: Awaited<ReturnType<typeof getSignedDocuments>>
    } = {
      pending: [],
      signed: [],
    }

    if (!statusFilter || statusFilter === 'pending' || statusFilter === 'all') {
      results.pending = await getPendingSigningRequests(tenantSlug, context.email)
    }

    if (!statusFilter || statusFilter === 'signed' || statusFilter === 'all') {
      results.signed = await getSignedDocuments(tenantSlug, context.email)
    }

    return Response.json({
      pending: results.pending,
      signed: results.signed,
      counts: {
        pending: results.pending.length,
        signed: results.signed.length,
      },
    })
  } catch (error) {
    console.error('Error fetching signing requests:', error)
    return Response.json({ error: 'Failed to fetch signing requests' }, { status: 500 })
  }
}
