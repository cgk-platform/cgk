export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * POST /api/admin/ai-agents/[agentId]/voice/test
 * Test voice configuration (TTS or STT)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { agentId: _agentId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

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
    'ai.voice.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { testType, provider, voiceId, audioUrl, sampleText } = body

    if (testType === 'tts') {
      const { testTTSConfig, type TTSProviderType } = await import('@cgk/ai-agents')

      if (!provider || !voiceId) {
        return NextResponse.json(
          { error: 'Provider and voiceId are required for TTS test' },
          { status: 400 }
        )
      }

      const result = await testTTSConfig(
        tenantId,
        provider as TTSProviderType,
        voiceId,
        sampleText || 'Hello! This is a test of the text-to-speech configuration.'
      )

      return NextResponse.json(result)
    }

    if (testType === 'stt') {
      const { testSTTConfig, type STTProviderType } = await import('@cgk/ai-agents')

      if (!provider || !audioUrl) {
        return NextResponse.json(
          { error: 'Provider and audioUrl are required for STT test' },
          { status: 400 }
        )
      }

      const result = await testSTTConfig(tenantId, provider as STTProviderType, audioUrl)

      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Invalid testType. Must be "tts" or "stt"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error testing voice config:', error)
    return NextResponse.json({ error: 'Failed to test voice configuration' }, { status: 500 })
  }
}
