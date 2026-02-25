/**
 * Environment variable validation for Command Center
 *
 * Called at request time (not import time) to avoid failing during next build.
 */

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const

const OPTIONAL_ENV_VARS = [
  'SESSION_SECRET',
  'OPENCLAW_CGK_GATEWAY_TOKEN',
  'OPENCLAW_RAWDOG_GATEWAY_TOKEN',
  'OPENCLAW_VITA_GATEWAY_TOKEN',
] as const

let validated = false

/** Call at request time to validate env vars once */
export function ensureEnvValidated(): void {
  if (validated) return
  validated = true

  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export const ENV_CONFIG = {
  required: REQUIRED_ENV_VARS,
  optional: OPTIONAL_ENV_VARS,
} as const
