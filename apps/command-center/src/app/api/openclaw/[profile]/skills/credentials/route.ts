import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'
import { SKILLS_DIRS } from '@/lib/state-dirs'

export const dynamic = 'force-dynamic'

interface VarStatus {
  name: string
  present: boolean
}

interface SkillCredential {
  name: string
  hasEnvFile: boolean
  requiredVars: VarStatus[]
  healthy: boolean
  category: string
}

function categorizeVar(name: string): string {
  if (name.startsWith('META_')) return 'Meta'
  if (name.startsWith('SP_')) return 'Amazon'
  if (name.startsWith('KLAVIYO_')) return 'Klaviyo'
  if (name.startsWith('GOOGLE_') || name.startsWith('VERTEX_')) return 'Google'
  if (name.startsWith('KLING_')) return 'Kling'
  if (name.startsWith('SLACK_')) return 'Slack'
  if (name.startsWith('OPENAI_')) return 'OpenAI'
  if (name.startsWith('ANTHROPIC_')) return 'Anthropic'
  if (name.startsWith('ELEVEN_')) return 'ElevenLabs'
  return 'Other'
}

function parseEnvFile(content: string): Map<string, string> {
  const vars = new Map<string, string>()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    vars.set(key, val)
  }
  return vars
}

function extractRequiredEnvFromSkillMd(content: string): string[] {
  // Look for requires.env in SKILL.md frontmatter or body
  const envVars: string[] = []

  // Pattern 1: YAML frontmatter with env array
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1]!
    const envSection = fm.match(/env:\s*\n((?:\s+-\s+\S+\n?)+)/)
    if (envSection) {
      const matches = envSection[1]!.matchAll(/^\s+-\s+(\S+)/gm)
      for (const m of matches) envVars.push(m[1]!)
    }
  }

  // Pattern 2: inline env references like `ENV_VAR`
  if (envVars.length === 0) {
    const matches = content.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)
    for (const m of matches) {
      const v = m[1]!
      // Filter out common non-env-var patterns
      if (!v.includes('HTTP') && !v.includes('URL') && v.length < 40) {
        envVars.push(v)
      }
    }
  }

  return [...new Set(envVars)]
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const skillsDir = SKILLS_DIRS[result.profile]

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    const skillDirs = entries.filter((e) => e.isDirectory())

    const skills: SkillCredential[] = []

    for (const dir of skillDirs) {
      const skillPath = join(skillsDir, dir.name)
      let requiredVars: string[] = []
      let envVars = new Map<string, string>()
      let hasEnvFile = false

      // Try to read SKILL.md for required env vars
      try {
        const skillMd = await readFile(join(skillPath, 'SKILL.md'), 'utf8')
        requiredVars = extractRequiredEnvFromSkillMd(skillMd)
      } catch {
        // no SKILL.md
      }

      // Try to read .env
      try {
        const envContent = await readFile(join(skillPath, '.env'), 'utf8')
        envVars = parseEnvFile(envContent)
        hasEnvFile = true
      } catch {
        // no .env
      }

      // Determine category from the first required var, or skill name
      const primaryCategory = requiredVars.length > 0
        ? categorizeVar(requiredVars[0]!)
        : 'Other'

      const varStatuses: VarStatus[] = requiredVars.map((name) => ({
        name,
        present: envVars.has(name) && envVars.get(name)! !== '',
      }))

      const healthy = requiredVars.length === 0 || varStatuses.every((v) => v.present)

      skills.push({
        name: dir.name,
        hasEnvFile,
        requiredVars: varStatuses,
        healthy,
        category: primaryCategory,
      })
    }

    const healthyCount = skills.filter((s) => s.healthy).length

    return Response.json({
      skills,
      totalCount: skills.length,
      healthyCount,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to check skill credentials' },
      { status: 502 }
    )
  }
}
