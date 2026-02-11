export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/voice/voices
 * List available voices for the tenant's TTS provider
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId: _agentId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const url = new URL(request.url)
  const provider = url.searchParams.get('provider') || 'elevenlabs'

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
    request,
    auth.tenantId || '',
    auth.userId,
    'ai.voice.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getAvailableVoices, type TTSProviderType } = await import('@cgk/ai-agents')

    const voices = await getAvailableVoices(tenantId, provider as TTSProviderType)

    return NextResponse.json({ voices, provider })
  } catch (error) {
    console.error('Error fetching voices:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch voices'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
