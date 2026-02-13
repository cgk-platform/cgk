/**
 * Customer Account API Client
 *
 * GraphQL client for Shopify Customer Account API queries.
 */

import { sql } from '@cgk-platform/db'
import type { GraphQLRequest, GraphQLResponse } from '../types'

const API_VERSION = '2025-01'

interface ShopifyConfig {
  shopId: string
}

/**
 * Get Shopify configuration for a tenant
 */
export async function getShopifyConfig(tenantId: string): Promise<ShopifyConfig | null> {
  try {
    const result = await sql<{ shopify_shop_id: string }>`
      SELECT shopify_shop_id
      FROM public.organizations
      WHERE slug = ${tenantId}
        AND status = 'active'
        AND shopify_shop_id IS NOT NULL
      LIMIT 1
    `

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      shopId: row.shopify_shop_id,
    }
  } catch (error) {
    console.error('Failed to get Shopify config:', error)
    return null
  }
}

/**
 * Execute a GraphQL query against the Customer Account API
 */
export async function customerQuery<T>(
  tenantId: string,
  accessToken: string,
  { query, variables }: GraphQLRequest
): Promise<GraphQLResponse<T>> {
  const config = await getShopifyConfig(tenantId)

  if (!config) {
    return {
      data: null,
      errors: [{ message: 'Shopify configuration not found for tenant' }],
    }
  }

  const apiUrl = `https://shopify.com/${config.shopId}/account/customer/api/${API_VERSION}/graphql`

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Customer API request failed:', response.status, errorText)
      return {
        data: null,
        errors: [{ message: `API request failed: ${response.status}` }],
      }
    }

    const result = (await response.json()) as GraphQLResponse<T>
    return result
  } catch (error) {
    console.error('Customer API error:', error)
    return {
      data: null,
      errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
    }
  }
}

/**
 * Execute a mutation against the Customer Account API
 */
export async function customerMutation<T>(
  tenantId: string,
  accessToken: string,
  { query, variables }: GraphQLRequest
): Promise<GraphQLResponse<T>> {
  return customerQuery<T>(tenantId, accessToken, { query, variables })
}
