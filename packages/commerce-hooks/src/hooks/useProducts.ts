'use client'

/**
 * Product Hooks
 *
 * Hooks for fetching and managing product data.
 *
 * @example
 * ```tsx
 * // List products
 * const { products, isLoading, loadMore } = useProducts({ first: 12 })
 *
 * // Get single product by handle
 * const { product, isLoading } = useProductByHandle('my-product')
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Product } from '@cgk-platform/commerce'
import type {
  UseProductsOptions,
  UseProductsReturn,
  UseProductByHandleReturn,
  ProductActions,
} from '../context/types'

/**
 * Hook for fetching a list of products
 *
 * @param actions - Product actions for server integration
 * @param options - Query options (pagination, filters)
 *
 * @example
 * ```tsx
 * function ProductGrid() {
 *   const { products, isLoading, hasNextPage, loadMore } = useProducts(
 *     productActions,
 *     { first: 12, tag: 'featured' }
 *   )
 *
 *   if (isLoading && products.length === 0) {
 *     return <ProductGridSkeleton />
 *   }
 *
 *   return (
 *     <>
 *       <div className="grid">
 *         {products.map(product => (
 *           <ProductCard key={product.id} product={product} />
 *         ))}
 *       </div>
 *       {hasNextPage && (
 *         <button onClick={loadMore} disabled={isLoading}>
 *           Load More
 *         </button>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function useProducts(
  actions: ProductActions,
  options: UseProductsOptions = {}
): UseProductsReturn {
  const { skip = false, ...params } = options

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | null>(null)

  // Track params for refetch
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Initial fetch
  useEffect(() => {
    if (skip) return

    let cancelled = false

    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await actions.getProducts(paramsRef.current)
        if (!cancelled) {
          setProducts(result.products)
          setHasNextPage(result.hasNextPage)
          setEndCursor(result.endCursor)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch products:', err)
          setError(err instanceof Error ? err.message : 'Failed to fetch products')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [skip, actions])

  // Load more products
  const loadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getProducts({
        ...paramsRef.current,
        after: endCursor,
      })

      setProducts((prev) => [...prev, ...result.products])
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to load more products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more products')
    } finally {
      setIsLoading(false)
    }
  }, [hasNextPage, endCursor, isLoading, actions])

  // Refetch from beginning
  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getProducts(paramsRef.current)
      setProducts(result.products)
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to refetch products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setIsLoading(false)
    }
  }, [actions])

  return {
    products,
    isLoading,
    error,
    hasNextPage,
    loadMore,
    refetch,
  }
}

/**
 * Hook for fetching a single product by handle
 *
 * @param actions - Product actions for server integration
 * @param handle - Product handle (URL slug)
 *
 * @example
 * ```tsx
 * function ProductPage({ handle }: { handle: string }) {
 *   const { product, isLoading, error } = useProductByHandle(productActions, handle)
 *
 *   if (isLoading) return <ProductSkeleton />
 *   if (error) return <ErrorMessage error={error} />
 *   if (!product) return <NotFound />
 *
 *   return <ProductDetails product={product} />
 * }
 * ```
 */
export function useProductByHandle(
  actions: ProductActions,
  handle: string
): UseProductByHandleReturn {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track handle changes
  const handleRef = useRef(handle)
  handleRef.current = handle

  useEffect(() => {
    let cancelled = false

    const fetchProduct = async () => {
      setIsLoading(true)
      setError(null)
      setProduct(null)

      try {
        const result = await actions.getProductByHandle(handle)
        if (!cancelled) {
          setProduct(result)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch product:', err)
          setError(err instanceof Error ? err.message : 'Failed to fetch product')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProduct()

    return () => {
      cancelled = true
    }
  }, [handle, actions])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.getProductByHandle(handleRef.current)
      setProduct(result)
    } catch (err) {
      console.error('Failed to refetch product:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch product')
    } finally {
      setIsLoading(false)
    }
  }, [actions])

  return {
    product,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for searching products
 *
 * @param actions - Product actions for server integration
 * @param query - Search query string
 * @param options - Search options
 *
 * @example
 * ```tsx
 * function SearchResults({ query }: { query: string }) {
 *   const { products, isLoading } = useProductSearch(productActions, query, {
 *     first: 20,
 *   })
 *
 *   if (isLoading) return <SearchSkeleton />
 *   if (products.length === 0) return <NoResults query={query} />
 *
 *   return <ProductGrid products={products} />
 * }
 * ```
 */
export function useProductSearch(
  actions: ProductActions,
  query: string,
  options: UseProductsOptions = {}
): UseProductsReturn {
  const { skip = false, ...params } = options

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(!skip && !!query)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [endCursor, setEndCursor] = useState<string | null>(null)

  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    if (skip || !query.trim()) {
      setProducts([])
      setHasNextPage(false)
      setEndCursor(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const searchProducts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await actions.searchProducts(query, paramsRef.current)
        if (!cancelled) {
          setProducts(result.products)
          setHasNextPage(result.hasNextPage)
          setEndCursor(result.endCursor)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to search products:', err)
          setError(err instanceof Error ? err.message : 'Failed to search products')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    searchProducts()

    return () => {
      cancelled = true
    }
  }, [skip, query, actions])

  const loadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor || isLoading || !query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.searchProducts(query, {
        ...paramsRef.current,
        after: endCursor,
      })

      setProducts((prev) => [...prev, ...result.products])
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to load more search results:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more results')
    } finally {
      setIsLoading(false)
    }
  }, [hasNextPage, endCursor, isLoading, query, actions])

  const refetch = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await actions.searchProducts(query, paramsRef.current)
      setProducts(result.products)
      setHasNextPage(result.hasNextPage)
      setEndCursor(result.endCursor)
    } catch (err) {
      console.error('Failed to refetch search results:', err)
      setError(err instanceof Error ? err.message : 'Failed to search products')
    } finally {
      setIsLoading(false)
    }
  }, [query, actions])

  return {
    products,
    isLoading,
    error,
    hasNextPage,
    loadMore,
    refetch,
  }
}
