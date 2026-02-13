export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ callId: string }> }

/**
 * GET /api/admin/ai-agents/calls/[callId]/transcript
 * Get full transcript for a voice call
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { callId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'json' // json or text

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
    const { getVoiceCall, getCallTranscripts, getFullTranscriptText } = await import('@cgk-platform/ai-agents')

    const result = await withTenant(tenantId, async () => {
      const call = await getVoiceCall(callId)
      if (!call) return null

      if (format === 'text') {
        const text = await getFullTranscriptText(callId)
        return { text }
      }

      const transcripts = await getCallTranscripts(callId)
      return { transcripts }
    })

    if (!result) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (format === 'text') {
      return new NextResponse(result.text, {
        headers: {
          'Content-Type': 'text/plain',
        },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 })
  }
}
