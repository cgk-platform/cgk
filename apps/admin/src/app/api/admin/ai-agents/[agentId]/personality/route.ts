export const dynamic = 'force-dynamic'

import { requireAuth, type AuthContext, checkPermissionOrRespond } from '@cgk-platform/auth'
import { withTenant } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

type RouteParams = { params: Promise<{ agentId: string }> }

/**
 * GET /api/admin/ai-agents/[agentId]/personality
 * Get agent personality configuration
 */
export async function GET(request: Request, { params }: RouteParams) {
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
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const { getAgentPersonality } = await import('@cgk-platform/ai-agents')

    const personality = await withTenant(tenantId, async () => {
      return getAgentPersonality(agentId)
    })

    if (!personality) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 })
    }

    return NextResponse.json({ personality })
  } catch (error) {
    console.error('Error fetching personality:', error)
    return NextResponse.json({ error: 'Failed to fetch personality' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-agents/[agentId]/personality
 * Update agent personality traits
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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
    'ai.agents.manage'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { updateAgentPersonality } = await import('@cgk-platform/ai-agents')

    // Validate trait values are between 0 and 1
    const traitKeys = [
      'traitFormality',
      'traitVerbosity',
      'traitProactivity',
      'traitHumor',
      'traitEmojiUsage',
      'traitAssertiveness',
    ]
    for (const key of traitKeys) {
      if (body[key] !== undefined) {
        const value = Number(body[key])
        if (isNaN(value) || value < 0 || value > 1) {
          return NextResponse.json(
            { error: `${key} must be a number between 0 and 1` },
            { status: 400 }
          )
        }
      }
    }

    const personality = await withTenant(tenantId, async () => {
      return updateAgentPersonality(agentId, {
        traitFormality: body.traitFormality,
        traitVerbosity: body.traitVerbosity,
        traitProactivity: body.traitProactivity,
        traitHumor: body.traitHumor,
        traitEmojiUsage: body.traitEmojiUsage,
        traitAssertiveness: body.traitAssertiveness,
        preferredGreeting: body.preferredGreeting,
        signature: body.signature,
        goToEmojis: body.goToEmojis,
        alwaysConfirmActions: body.alwaysConfirmActions,
        offerAlternatives: body.offerAlternatives,
        explainReasoning: body.explainReasoning,
        customGreetingTemplates: body.customGreetingTemplates,
        customErrorTemplates: body.customErrorTemplates,
        forbiddenTopics: body.forbiddenTopics,
      })
    })

    if (!personality) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 })
    }

    return NextResponse.json({ personality })
  } catch (error) {
    console.error('Error updating personality:', error)
    return NextResponse.json({ error: 'Failed to update personality' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ai-agents/[agentId]/personality/preview
 * Generate a preview of the personality in action
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
    'ai.agents.view'
  )
  if (permissionDenied) return permissionDenied

  try {
    const body = await request.json()
    const { getAgentPersonality, generatePersonalityPreview, buildPersonalityPromptSection } =
      await import('@cgk-platform/ai-agents')

    const result = await withTenant(tenantId, async () => {
      const personality = await getAgentPersonality(agentId)
      if (!personality) return null

      const scenario = body.scenario || 'greeting'
      const preview = generatePersonalityPreview(personality, scenario)
      const promptSection = buildPersonalityPromptSection(personality)

      return { preview, promptSection }
    })

    if (!result) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating preview:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
