import type { ProfileSlug } from '@cgk-platform/openclaw'

const HOME = process.env.HOME || '/Users/novarussell'

export const STATE_DIRS: Record<ProfileSlug, string> = {
  cgk: `${HOME}/.openclaw`,
  rawdog: `${HOME}/.openclaw-rawdog`,
  vitahustle: `${HOME}/.openclaw-vitahustle`,
}

export const WORKSPACE_ROOTS: Record<ProfileSlug, string> = {
  cgk: `${HOME}/.openclaw/workspace`,
  rawdog: `${HOME}/.openclaw-rawdog/workspace`,
  vitahustle: `${HOME}/.openclaw-vitahustle/workspace`,
}

export const SKILLS_DIRS: Record<ProfileSlug, string> = {
  cgk: `${HOME}/.openclaw/skills`,
  rawdog: `${HOME}/.openclaw-rawdog/skills`,
  vitahustle: `${HOME}/.openclaw-vitahustle/skills`,
}
