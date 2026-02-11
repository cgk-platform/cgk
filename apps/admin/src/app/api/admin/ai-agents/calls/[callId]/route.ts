export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ callId: string }> }

/**
 * GET /api/admin/ai-agents/calls/[callId]
 * Get a specific voice call with transcript
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { callId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const url = new URL(request.url)
  const includeTranscript = url.searchParams.get('includeTranscript') !== 'false'
  const includeResponses = url.searchParams.get('includeResponses') === 'true'

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  let auth: AuthContext
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionDenied = await checkPermissionOrRespond(
    auth.userId,
    auth.tenantId || '',
    'ai.calls.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getVoiceCall, getCallTranscripts, getCallResponses } = await import('@cgk/ai-agents')

    const result = await withTenant(tenantId, async () => {
      const call = await getVoiceCall(callId)
      if (!call) return null

      let transcripts = null
      let responses = null

      if (includeTranscript) {
        transcripts = await getCallTranscripts(callId)
      }

      if (includeResponses) {
        responses = await getCallResponses(callId)
      }

      return { call, transcripts, responses }
    })

    if (!result) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching voice call:', error)
    return NextResponse.json({ error: 'Failed to fetch voice call' }, { status: 500 })
  }
}
