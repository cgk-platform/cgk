/**
 * Fetch utilities with timeout support
 *
 * @ai-pattern security
 * @ai-required All external API calls MUST use fetchWithTimeout
 */

/**
 * Default timeout values (in milliseconds)
 */
export const FETCH_TIMEOUTS = {
  /** Quick operations like token exchange (15s) */
  OAUTH: 15000,
  /** Payment/payout operations (30s) */
  PAYMENT: 30000,
  /** Standard API calls (30s) */
  API: 30000,
  /** Long operations like file uploads (60s) */
  UPLOAD: 60000,
  /** Webhook deliveries (10s) */
  WEBHOOK: 10000,
} as const

export type TimeoutType = keyof typeof FETCH_TIMEOUTS

/**
 * Fetch with automatic timeout handling
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options plus optional timeout
 * @returns The fetch response
 * @throws Error if the request times out
 *
 * @example
 * ```typescript
 * // With default 30s timeout
 * const response = await fetchWithTimeout('https://api.example.com/data')
 *
 * // With custom timeout in ms
 * const response = await fetchWithTimeout(url, { timeout: 15000 })
 *
 * // Using predefined timeout type
 * const response = await fetchWithTimeout(url, { timeoutType: 'OAUTH' })
 * ```
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit & {
    timeout?: number
    timeoutType?: TimeoutType
  } = {}
): Promise<Response> {
  const { timeout, timeoutType, ...fetchOptions } = options

  // Determine timeout value
  const timeoutMs = timeout ?? (timeoutType ? FETCH_TIMEOUTS[timeoutType] : FETCH_TIMEOUTS.API)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Create a fetch function with a preset timeout
 *
 * @param defaultTimeout - Default timeout in ms or timeout type
 * @returns A fetch function with the preset timeout
 *
 * @example
 * ```typescript
 * const oauthFetch = createFetchWithTimeout('OAUTH')
 * const response = await oauthFetch('https://oauth.example.com/token', { method: 'POST' })
 * ```
 */
export function createFetchWithTimeout(
  defaultTimeout: number | TimeoutType
): (url: string | URL, options?: RequestInit) => Promise<Response> {
  const timeoutMs =
    typeof defaultTimeout === 'number' ? defaultTimeout : FETCH_TIMEOUTS[defaultTimeout]

  return (url, options = {}) => fetchWithTimeout(url, { ...options, timeout: timeoutMs })
}
