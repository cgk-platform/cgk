/**
 * Environment Validation
 *
 * Validates required environment variables at runtime.
 * Import this module at the top of entry points to fail fast
 * if required variables are missing.
 *
 * Note: This runs at request time in Edge runtime, not at build time.
 */

const requiredVars = ['JWT_SECRET', 'DATABASE_URL'] as const

/**
 * Validate that all required environment variables are set.
 * Throws an error with a helpful message if any are missing.
 */
export function validateEnv(): void {
  const missing: string[] = []

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        `See .env.example for required variables.`
    )
  }
}

/**
 * Flag to track if validation has already run (for lazy validation)
 */
let validated = false

/**
 * Lazily validate environment variables.
 * Only runs validation once, subsequent calls are no-ops.
 * Use this in route handlers to validate at first request.
 */
export function ensureEnvValidated(): void {
  if (!validated) {
    validateEnv()
    validated = true
  }
}

// Re-export for type-safe access to env vars
export const env = {
  get JWT_SECRET(): string {
    const value = process.env.JWT_SECRET
    if (!value) throw new Error('JWT_SECRET is not set')
    return value
  },
  get DATABASE_URL(): string {
    const value = process.env.DATABASE_URL
    if (!value) throw new Error('DATABASE_URL is not set')
    return value
  },
  get PORT(): number {
    return parseInt(process.env.PORT || '3500', 10)
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development'
  },
  get LOG_LEVEL(): string {
    return process.env.LOG_LEVEL || 'info'
  },
} as const
