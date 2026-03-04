import { homedir } from 'os'
import { PROFILES } from '@cgk-platform/openclaw'

const HOME = process.env.HOME || homedir()

/**
 * Well-known state dir paths for the standard 3-profile setup.
 * These exact paths are preserved for backward compatibility.
 */
const WELL_KNOWN_STATE_DIRS: Record<string, string> = {
  cgk: `${HOME}/.openclaw`,
  rawdog: `${HOME}/.openclaw-rawdog`,
  vitahustle: `${HOME}/.openclaw-vitahustle`,
}

function resolveStateDir(slug: string): string {
  const envKey = `OPENCLAW_${slug.toUpperCase()}_STATE_DIR`
  const fromEnv = process.env[envKey]
  if (fromEnv) return fromEnv

  if (WELL_KNOWN_STATE_DIRS[slug]) return WELL_KNOWN_STATE_DIRS[slug]!

  const suffix = slug === 'default' ? '' : `-${slug}`
  return `${HOME}/.openclaw${suffix}`
}

export const STATE_DIRS: Record<string, string> = Object.fromEntries(
  Object.keys(PROFILES).map((slug) => [slug, resolveStateDir(slug)])
)

export const WORKSPACE_ROOTS: Record<string, string> = Object.fromEntries(
  Object.keys(PROFILES).map((slug) => [slug, `${resolveStateDir(slug)}/workspace`])
)

export const SKILLS_DIRS: Record<string, string> = Object.fromEntries(
  Object.keys(PROFILES).map((slug) => [slug, `${resolveStateDir(slug)}/skills`])
)
