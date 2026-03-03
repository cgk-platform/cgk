#!/usr/bin/env tsx
/**
 * Test script to verify Shopify product API access
 */

import { getShopifyCredentialsBySlug } from '../packages/shopify/src/oauth/credentials'
import { createAdminClient } from '../packages/shopify/src/admin'

async function main() {
  try {
    console.log('1. Getting Shopify credentials for meliusly...')
    const credentials = await getShopifyCredentialsBySlug('meliusly')
    console.log('✅ Credentials retrieved:', {
      shop: credentials.shop,
      apiVersion: credentials.apiVersion,
      hasToken: !!credentials.accessToken,
    })

    console.log('\n2. Creating Admin API client...')
    const client = createAdminClient({
      storeDomain: credentials.shop,
      adminAccessToken: credentials.accessToken,
      apiVersion: credentials.apiVersion,
    })
    console.log('✅ Client created')

    console.log('\n3. Fetching products...')
    const query = `
      query {
        products(first: 5) {
          edges {
            node {
              id
              title
              handle
              status
              totalInventory
            }
          }
        }
      }
    `

    const response = await client.query(query)
    console.log('✅ Products fetched:', JSON.stringify(response, null, 2))

    if (response.data?.products?.edges?.length > 0) {
      console.log('\n✅ SUCCESS - Found products:', response.data.products.edges.length)
      response.data.products.edges.forEach((edge: any, i: number) => {
        console.log(`  ${i + 1}. ${edge.node.title} (${edge.node.handle})`)
      })
    } else {
      console.log('\n⚠️  No products found in Shopify store')
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error)
    process.exit(1)
  }
}

main()
