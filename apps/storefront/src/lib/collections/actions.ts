/**
 * Collection Server Actions
 *
 * Server-side actions for collection page operations like pagination.
 */

'use server'

import type { Product } from '@cgk-platform/commerce'

import { getCommerceProvider } from '../commerce'

interface LoadMoreParams {
  handle: string
  cursor: string
  sortKey?: string
  reverse?: boolean
}

interface LoadMoreResult {
  products: Product[]
  hasNextPage: boolean
  endCursor: string | null
}

export async function loadMoreCollectionProducts(
  params: LoadMoreParams
): Promise<LoadMoreResult> {
  const commerce = await getCommerceProvider()

  if (!commerce) {
    return { products: [], hasNextPage: false, endCursor: null }
  }

  const result = await commerce.collections.getProducts(params.handle, {
    first: 16,
    after: params.cursor,
    sortKey: params.sortKey ?? 'BEST_SELLING',
    reverse: params.reverse ?? false,
  })

  if (!result) {
    return { products: [], hasNextPage: false, endCursor: null }
  }

  return {
    products: result.items,
    hasNextPage: result.pageInfo.hasNextPage,
    endCursor: result.pageInfo.endCursor ?? null,
  }
}
