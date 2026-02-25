/**
 * Environment variable validation for Command Center
 *
 * Imported at app startup to fail fast on missing variables.
 * Gateway tokens are required — without them we can't connect.
 */

import { validateRequiredEnv, validateEnv } from '@cgk-platform/core'

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const

const OPTIONAL_ENV_VARS = [
  'SESSION_SECRET',
  'OPENCLAW_CGK_GATEWAY_TOKEN',
  'OPENCLAW_RAWDOG_GATEWAY_TOKEN',
  'OPENCLAW_VITA_GATEWAY_TOKEN',
] as const

validateRequiredEnv([...REQUIRED_ENV_VARS])

if (process.env.NODE_ENV === 'development') {
  const result = validateEnv([], [...OPTIONAL_ENV_VARS])
  if (result.warnings.length > 0) {
    console.warn(`[COMMAND-CENTER] Missing optional env vars: ${result.warnings.join(', ')}`)
  }
}

export const ENV_CONFIG = {
  required: REQUIRED_ENV_VARS,
  optional: OPTIONAL_ENV_VARS,
} as const
