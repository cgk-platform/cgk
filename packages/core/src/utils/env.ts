/**
 * Environment variable validation utilities
 *
 * Provides startup validation for critical environment variables.
 * Should be called early in app initialization to fail fast on misconfigurations.
 */

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validates that all required environment variables are present.
 * Throws an error if any required variables are missing.
 *
 * @param vars - Array of environment variable names that must be set
 * @throws Error if any required environment variables are missing
 *
 * @example
 * ```ts
 * // In app startup or layout.tsx
 * validateRequiredEnv(['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'])
 * ```
 */
export function validateRequiredEnv(vars: readonly string[]): void {
  const missing = vars.filter((v) => !process.env[v])

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`
    console.error(`[ENV VALIDATION ERROR] ${errorMessage}`)
    throw new Error(errorMessage)
  }
}

/**
 * Validates environment variables and returns a detailed result.
 * Does not throw - useful for logging or graceful degradation.
 *
 * @param required - Array of required environment variable names
 * @param optional - Array of optional environment variable names (warns if missing)
 * @returns Validation result with missing and warning details
 *
 * @example
 * ```ts
 * const result = validateEnv(
 *   ['DATABASE_URL', 'JWT_SECRET'],
 *   ['STRIPE_SECRET_KEY', 'RESEND_API_KEY']
 * )
 *
 * if (!result.valid) {
 *   console.error('Missing required env vars:', result.missing)
 *   process.exit(1)
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.warn('Missing optional env vars:', result.warnings)
 * }
 * ```
 */
export function validateEnv(
  required: readonly string[],
  optional: readonly string[] = []
): EnvValidationResult {
  const missing = required.filter((v) => !process.env[v])
  const warnings = optional.filter((v) => !process.env[v])

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Checks if an environment variable is set and not empty.
 *
 * @param name - Environment variable name
 * @returns true if the variable is set and has a non-empty value
 *
 * @example
 * ```ts
 * if (isEnvSet('STRIPE_SECRET_KEY')) {
 *   // Enable Stripe features
 * }
 * ```
 */
export function isEnvSet(name: string): boolean {
  const value = process.env[name]
  return value !== undefined && value !== ''
}

/**
 * Gets an environment variable value with a fallback default.
 * Useful for optional configuration with sensible defaults.
 *
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or the default
 *
 * @example
 * ```ts
 * const port = getEnvOrDefault('PORT', '3000')
 * const logLevel = getEnvOrDefault('LOG_LEVEL', 'info')
 * ```
 */
export function getEnvOrDefault(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue
}

/**
 * Gets a required environment variable value.
 * Throws if the variable is not set.
 *
 * @param name - Environment variable name
 * @returns The environment variable value
 * @throws Error if the variable is not set
 *
 * @example
 * ```ts
 * const databaseUrl = getRequiredEnv('DATABASE_URL')
 * ```
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

/**
 * App-specific environment variable configurations.
 * Defines required and optional env vars for each app.
 */
export const APP_ENV_CONFIGS = {
  admin: {
    required: ['DATABASE_URL', 'JWT_SECRET'],
    optional: ['SESSION_SECRET', 'STRIPE_SECRET_KEY'],
  },
  orchestrator: {
    required: ['DATABASE_URL', 'JWT_SECRET'],
    optional: ['SESSION_SECRET'],
  },
  'creator-portal': {
    required: ['DATABASE_URL', 'JWT_SECRET'],
    optional: ['SESSION_SECRET'],
  },
  'contractor-portal': {
    required: ['DATABASE_URL'],
    // Contractor portal may use JWT_SECRET or CONTRACTOR_JWT_SECRET
    optional: ['JWT_SECRET', 'CONTRACTOR_JWT_SECRET', 'SESSION_SECRET'],
  },
  storefront: {
    required: ['DATABASE_URL'],
    optional: ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_STOREFRONT_ACCESS_TOKEN'],
  },
} as const

export type AppName = keyof typeof APP_ENV_CONFIGS

/**
 * Validates environment variables for a specific app.
 * Uses predefined configurations from APP_ENV_CONFIGS.
 *
 * @param appName - The app name (admin, orchestrator, etc.)
 * @throws Error if required environment variables are missing
 *
 * @example
 * ```ts
 * // In apps/admin layout.tsx
 * validateAppEnv('admin')
 * ```
 */
export function validateAppEnv(appName: AppName): void {
  const config = APP_ENV_CONFIGS[appName]
  validateRequiredEnv(config.required)

  // Log warnings for missing optional vars (only in development)
  if (process.env.NODE_ENV === 'development') {
    const result = validateEnv([], config.optional)
    if (result.warnings.length > 0) {
      console.warn(
        `[${appName.toUpperCase()}] Missing optional env vars: ${result.warnings.join(', ')}`
      )
    }
  }
}
