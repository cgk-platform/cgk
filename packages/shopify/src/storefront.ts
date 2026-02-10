/**
 * Shopify Storefront API client
 */

import { type StorefrontConfig, DEFAULT_API_VERSION, normalizeStoreDomain } from './config'

export interface StorefrontClient {
  readonly storeDomain: string
  readonly apiVersion: string
  query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>
}

/**
 * Create a Storefront API client
 */
export function createStorefrontClient(config: StorefrontConfig): StorefrontClient {
  const storeDomain = normalizeStoreDomain(config.storeDomain)
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION

  const endpoint = `https://${storeDomain}/api/${apiVersion}/graphql.json`

  async function query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    })

    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json() as { data?: T; errors?: Array<{ message: string }> }

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Storefront API GraphQL error: ${json.errors[0]?.message ?? 'Unknown error'}`)
    }

    return json.data as T
  }

  return {
    storeDomain,
    apiVersion,
    query,
  }
}
