import { PROFILE_SLUGS } from '@cgk-platform/openclaw'

import { tryGetGatewayClient } from '@/lib/gateway-pool'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const results = await Promise.allSettled(
    PROFILE_SLUGS.map(async (slug) => {
      const client = await tryGetGatewayClient(slug)
      if (!client) return { slug, skills: null, config: null }
      const [skills, config] = await Promise.allSettled([
        client.skillsStatus(),
        client.configGet(),
      ])
      return {
        slug,
        skills: skills.status === 'fulfilled' ? skills.value : null,
        config: config.status === 'fulfilled' ? config.value : null,
      }
    })
  )

  const profiles: Record<string, unknown> = {}
  const allSkillNames = new Set<string>()

  for (const result of results) {
    if (result.status === 'fulfilled') {
      profiles[result.value.slug] = result.value
      if (result.value.skills) {
        for (const s of result.value.skills) {
          allSkillNames.add(s.name)
        }
      }
    }
  }

  // Compute skill diffs
  const skillDiffs: Array<{
    name: string
    present: Record<string, boolean>
  }> = []

  for (const name of allSkillNames) {
    const present: Record<string, boolean> = {}
    for (const slug of PROFILE_SLUGS) {
      const profileData = profiles[slug] as { skills: Array<{ name: string }> | null } | undefined
      present[slug] = profileData?.skills?.some((s) => s.name === name) ?? false
    }
    const values = Object.values(present)
    if (values.some((v) => v !== values[0])) {
      skillDiffs.push({ name, present })
    }
  }

  return Response.json({ profiles, skillDiffs })
}
