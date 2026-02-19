/**
 * Shopify Admin API client
 */

import { type AdminConfig, DEFAULT_API_VERSION, normalizeStoreDomain } from './config'

export interface AdminClient {
  readonly storeDomain: string
  readonly apiVersion: string
  query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>
}

const MAX_RETRIES = 3

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create an Admin API client
 */
export function createAdminClient(config: AdminConfig): AdminClient {
  const storeDomain = normalizeStoreDomain(config.storeDomain)
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION

  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`

  async function query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.adminAccessToken,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables,
        }),
      })

      // Handle HTTP 429 rate limit
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 2000
        console.warn(`[Shopify Admin] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        throw new Error(`Admin API error: ${response.status} ${response.statusText}`)
      }

      const json = await response.json() as {
        data?: T
        errors?: Array<{ message: string }>
        extensions?: { cost?: { throttleStatus?: { currentlyAvailable?: number } } }
      }

      // Handle GraphQL throttle errors
      if (json.errors && json.errors.length > 0) {
        const isThrottled = json.errors.some(e => e.message.includes('Throttled'))
        if (isThrottled && attempt < MAX_RETRIES) {
          console.warn(`[Shopify Admin] GraphQL throttled, retrying in 1s (attempt ${attempt + 1}/${MAX_RETRIES})`)
          await sleep(1000)
          continue
        }
        throw new Error(`Admin API GraphQL error: ${json.errors[0]?.message ?? 'Unknown error'}`)
      }

      return json.data as T
    }

    throw new Error('Admin API: max retries exceeded')
  }

  return {
    storeDomain,
    apiVersion,
    query,
  }
}
