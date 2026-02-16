/**
 * Environment variable validation for Contractor Portal
 *
 * This file is imported at app startup to ensure all required
 * environment variables are present. Missing variables will
 * cause the app to fail fast with a clear error message.
 *
 * Note: Contractor portal may use either JWT_SECRET or CONTRACTOR_JWT_SECRET
 * for authentication. The validation checks that DATABASE_URL is present,
 * and warns about missing JWT secrets in development.
 */

import { validateRequiredEnv, validateEnv, isEnvSet } from '@cgk-platform/core'

// Required environment variables - app will not start without these
const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const

// Optional environment variables - warnings logged in development
// At least one of JWT_SECRET or CONTRACTOR_JWT_SECRET should be set
const OPTIONAL_ENV_VARS = ['JWT_SECRET', 'CONTRACTOR_JWT_SECRET', 'SESSION_SECRET'] as const

// Validate on import (module side effect)
validateRequiredEnv([...REQUIRED_ENV_VARS])

// Check for JWT secret availability
const hasJwtSecret = isEnvSet('JWT_SECRET') || isEnvSet('CONTRACTOR_JWT_SECRET')
if (!hasJwtSecret) {
  console.warn(
    '[CONTRACTOR-PORTAL] Warning: Neither JWT_SECRET nor CONTRACTOR_JWT_SECRET is set. ' +
      'Authentication features may not work correctly.'
  )
}

// Log warnings for missing optional vars in development
if (process.env.NODE_ENV === 'development') {
  const result = validateEnv([], [...OPTIONAL_ENV_VARS])
  if (result.warnings.length > 0) {
    console.warn(`[CONTRACTOR-PORTAL] Missing optional env vars: ${result.warnings.join(', ')}`)
  }
}

// Export for testing purposes
export const ENV_CONFIG = {
  required: REQUIRED_ENV_VARS,
  optional: OPTIONAL_ENV_VARS,
} as const
