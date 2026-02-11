/**
 * Klaviyo API configuration
 *
 * @ai-pattern api-config
 * @ai-note Klaviyo uses API keys, not OAuth
 */

/** Klaviyo API endpoints */
export const KLAVIYO_CONFIG = {
  /** Klaviyo API base URL */
  apiUrl: 'https://a.klaviyo.com/api',

  /** API revision (required header) */
  apiRevision: '2024-02-15',

  /** API key prefix for validation */
  apiKeyPrefix: 'pk_',
} as const

/** Get the integration encryption key from environment */
export function getIntegrationEncryptionKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY environment variable must be at least 32 characters'
    )
  }
  return key
}

/**
 * Validate Klaviyo API key format
 */
export function isValidKlaviyoApiKey(apiKey: string): boolean {
  return (
    typeof apiKey === 'string' &&
    apiKey.startsWith(KLAVIYO_CONFIG.apiKeyPrefix) &&
    apiKey.length > 10
  )
}
