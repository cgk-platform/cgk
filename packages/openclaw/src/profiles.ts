import type { ProfileConfig, ProfileSlug } from './types.js'

/**
 * Well-known profile defaults for the standard 3-profile setup.
 * Used as fallback when OPENCLAW_PROFILES env var is not set.
 */
const WELL_KNOWN_PROFILES: ProfileConfig[] = [
  {
    slug: 'cgk',
    label: 'CGK Linens',
    portEnvVar: 'OPENCLAW_CGK_PORT',
    tokenEnvVar: 'OPENCLAW_CGK_GATEWAY_TOKEN',
    urlEnvVar: 'OPENCLAW_CGK_URL',
    defaultPort: 18789,
  },
  {
    slug: 'rawdog',
    label: 'RAWDOG',
    portEnvVar: 'OPENCLAW_RAWDOG_PORT',
    tokenEnvVar: 'OPENCLAW_RAWDOG_GATEWAY_TOKEN',
    urlEnvVar: 'OPENCLAW_RAWDOG_URL',
    defaultPort: 19001,
  },
  {
    slug: 'vitahustle',
    label: 'VitaHustle',
    portEnvVar: 'OPENCLAW_VITA_PORT',
    tokenEnvVar: 'OPENCLAW_VITA_GATEWAY_TOKEN',
    urlEnvVar: 'OPENCLAW_VITA_URL',
    defaultPort: 19021,
  },
]

/**
 * Discover profiles from environment configuration.
 *
 * Priority order:
 * 1. OPENCLAW_PROFILES — JSON array of ProfileConfig objects (explicit override)
 * 2. OPENCLAW_*_PORT env vars — auto-detect slugs from matching env var names
 * 3. Fallback — use WELL_KNOWN_PROFILES (standard 3-profile setup)
 */
export function discoverProfiles(): ProfileConfig[] {
  // 1. Explicit JSON config via OPENCLAW_PROFILES
  const profilesEnv = process.env.OPENCLAW_PROFILES
  if (profilesEnv) {
    try {
      const parsed = JSON.parse(profilesEnv) as ProfileConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // malformed JSON — fall through to next strategy
    }
  }

  // 2. Auto-detect from OPENCLAW_*_PORT env vars
  // e.g. OPENCLAW_CGK_PORT=18789 → slug "cgk"
  const portVarPattern = /^OPENCLAW_([A-Z0-9]+)_PORT$/
  const detectedSlugs: string[] = []

  for (const key of Object.keys(process.env)) {
    const match = portVarPattern.exec(key)
    if (match) {
      const slug = match[1]!.toLowerCase()
      detectedSlugs.push(slug)
    }
  }

  if (detectedSlugs.length > 0) {
    return detectedSlugs.map((slug): ProfileConfig => {
      // Check if this slug matches a well-known profile (use its config as base)
      const wellKnown = WELL_KNOWN_PROFILES.find((p) => p.slug === slug)
      if (wellKnown) return wellKnown

      // Unknown slug — derive env var names from slug pattern
      const upper = slug.toUpperCase()
      return {
        slug,
        label: slug.charAt(0).toUpperCase() + slug.slice(1),
        portEnvVar: `OPENCLAW_${upper}_PORT`,
        tokenEnvVar: `OPENCLAW_${upper}_GATEWAY_TOKEN`,
        urlEnvVar: `OPENCLAW_${upper}_URL`,
        defaultPort: parseInt(process.env[`OPENCLAW_${upper}_PORT`] ?? '18789', 10),
      }
    })
  }

  // 3. Fallback — standard 3-profile setup
  const defaultPortEnv = process.env.OPENCLAW_DEFAULT_PORT
  if (defaultPortEnv) {
    const port = parseInt(defaultPortEnv, 10)
    if (!isNaN(port)) {
      return [
        {
          slug: 'default',
          label: 'Default',
          portEnvVar: 'OPENCLAW_DEFAULT_PORT',
          tokenEnvVar: 'OPENCLAW_GATEWAY_TOKEN',
          urlEnvVar: 'OPENCLAW_URL',
          defaultPort: port,
        },
      ]
    }
  }

  return WELL_KNOWN_PROFILES
}

/**
 * Profile-to-gateway mapping configuration.
 * Populated from discoverProfiles() at module load time.
 * Ports and tokens are resolved from environment variables at call time.
 */
export const PROFILES: Record<string, ProfileConfig> = Object.fromEntries(
  discoverProfiles().map((p) => [p.slug, p])
)

/** All valid profile slugs */
export const PROFILE_SLUGS: ProfileSlug[] = Object.keys(PROFILES)

/** Validate a string is a valid profile slug */
export function isValidProfile(slug: string): slug is ProfileSlug {
  return Object.prototype.hasOwnProperty.call(PROFILES, slug)
}

/** Get port for a profile from env or default */
export function getProfilePort(slug: ProfileSlug): number {
  const profile = PROFILES[slug]
  if (!profile) throw new Error(`Unknown profile: ${slug}`)
  const envValue = process.env[profile.portEnvVar]
  if (envValue) {
    const port = parseInt(envValue, 10)
    if (!isNaN(port)) return port
  }
  return profile.defaultPort
}

/** Get auth token for a profile from env */
export function getProfileToken(slug: ProfileSlug): string | undefined {
  const profile = PROFILES[slug]
  if (!profile) return undefined
  return process.env[profile.tokenEnvVar]
}

/**
 * Get the full WebSocket URL for a profile.
 * Checks for OPENCLAW_{SLUG}_URL env var override first (for remote/Tailscale access),
 * then falls back to ws://127.0.0.1:{port}.
 */
export function getProfileUrl(slug: ProfileSlug): string {
  const profile = PROFILES[slug]
  if (!profile) throw new Error(`Unknown profile: ${slug}`)
  const envUrl = process.env[profile.urlEnvVar]
  if (envUrl) return envUrl

  const port = getProfilePort(slug)
  return `ws://127.0.0.1:${port}`
}
