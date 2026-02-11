export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk/auth'
import { withTenant } from '@cgk/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/calls
 * List voice calls for an agent
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { agentId } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const url = new URL(request.url)

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
    const { listVoiceCalls } = await import('@cgk/ai-agents')

    // Parse filters from query params
    const direction = url.searchParams.get('direction') as 'inbound' | 'outbound' | undefined
    const status = url.searchParams.get('status') as string | undefined
    const creatorId = url.searchParams.get('creatorId') || undefined
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const calls = await withTenant(tenantId, async () => {
      return listVoiceCalls({
        agentId,
        direction,
        status: status as NonNullable<Parameters<typeof listVoiceCalls>[0]>['status'],
        creatorId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset,
      })
    })

    return NextResponse.json({ calls })
  } catch (error) {
    console.error('Error fetching voice calls:', error)
    return NextResponse.json({ error: 'Failed to fetch voice calls' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-agents/[agentId]/calls
 * Initiate an outbound voice call
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { agentId } = await params
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
    auth.userId,
    auth.tenantId || '',
    'ai.calls.initiate'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { toNumber, context, creatorId, contactId } = body

    if (!toNumber) {
      return NextResponse.json({ error: 'toNumber is required' }, { status: 400 })
    }

    const {
      createRetellClient,
      getAgentVoiceConfig,
      getVoiceCredentials,
    } = await import('@cgk/ai-agents')

    // Get voice config and credentials
    const [voiceConfig, credentials] = await withTenant(tenantId, async () => {
      const config = await getAgentVoiceConfig(agentId)
      const creds = await getVoiceCredentials(tenantId)
      return [config, creds] as const
    })

    if (!voiceConfig) {
      return NextResponse.json({ error: 'Voice not configured for this agent' }, { status: 400 })
    }

    if (!voiceConfig.phoneNumber) {
      return NextResponse.json({ error: 'Agent does not have a phone number configured' }, { status: 400 })
    }

    if (!credentials?.retellApiKeyEncrypted) {
      return NextResponse.json({ error: 'Retell API key not configured' }, { status: 400 })
    }

    // Create Retell client and initiate call
    const retellClient = createRetellClient(credentials.retellApiKeyEncrypted, tenantId)

    const call = await withTenant(tenantId, async () => {
      return retellClient.createOutboundCall({
        agentId,
        toNumber,
        fromNumber: voiceConfig.phoneNumber!,
        context,
        creatorId,
        contactId,
      })
    })

    return NextResponse.json({ call })
  } catch (error) {
    console.error('Error initiating voice call:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate voice call'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
