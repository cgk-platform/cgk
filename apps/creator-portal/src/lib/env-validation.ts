/**
 * Environment variable validation for Creator Portal
 *
 * This file is imported at app startup to ensure all required
 * environment variables are present. Missing variables will
 * cause the app to fail fast with a clear error message.
 */

import { validateRequiredEnv, validateEnv } from '@cgk-platform/core'

// Required environment variables - app will not start without these
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'] as const

// Optional environment variables - warnings logged in development
const OPTIONAL_ENV_VARS = ['SESSION_SECRET'] as const

// Validate on import (module side effect)
validateRequiredEnv([...REQUIRED_ENV_VARS])

// Log warnings for missing optional vars in development
if (process.env.NODE_ENV === 'development') {
  const result = validateEnv([], [...OPTIONAL_ENV_VARS])
  if (result.warnings.length > 0) {
    console.warn(`[CREATOR-PORTAL] Missing optional env vars: ${result.warnings.join(', ')}`)
  }
}

// Export for testing purposes
export const ENV_CONFIG = {
  required: REQUIRED_ENV_VARS,
  optional: OPTIONAL_ENV_VARS,
} as const
