import type { ProfileConfig, ProfileSlug } from './types.js'

/**
 * Profile-to-gateway mapping configuration.
 * Ports and tokens are resolved from environment variables.
 */
export const PROFILES: Record<ProfileSlug, ProfileConfig> = {
  cgk: {
    slug: 'cgk',
    label: 'CGK Linens',
    portEnvVar: 'OPENCLAW_CGK_PORT',
    tokenEnvVar: 'OPENCLAW_CGK_GATEWAY_TOKEN',
    defaultPort: 18789,
  },
  rawdog: {
    slug: 'rawdog',
    label: 'RAWDOG',
    portEnvVar: 'OPENCLAW_RAWDOG_PORT',
    tokenEnvVar: 'OPENCLAW_RAWDOG_GATEWAY_TOKEN',
    defaultPort: 19001,
  },
  vitahustle: {
    slug: 'vitahustle',
    label: 'VitaHustle',
    portEnvVar: 'OPENCLAW_VITA_PORT',
    tokenEnvVar: 'OPENCLAW_VITA_GATEWAY_TOKEN',
    defaultPort: 19021,
  },
} as const

/** All valid profile slugs */
export const PROFILE_SLUGS: ProfileSlug[] = ['cgk', 'rawdog', 'vitahustle']

/** Validate a string is a valid profile slug */
export function isValidProfile(slug: string): slug is ProfileSlug {
  return PROFILE_SLUGS.includes(slug as ProfileSlug)
}

/** Get port for a profile from env or default */
export function getProfilePort(slug: ProfileSlug): number {
  const profile = PROFILES[slug]
  const envValue = process.env[profile.portEnvVar]
  if (envValue) {
    const port = parseInt(envValue, 10)
    if (!isNaN(port)) return port
  }
  return profile.defaultPort
}

/** Get auth token for a profile from env */
export function getProfileToken(slug: ProfileSlug): string | undefined {
  return process.env[PROFILES[slug].tokenEnvVar]
}
