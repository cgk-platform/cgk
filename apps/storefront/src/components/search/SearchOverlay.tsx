/**
 * Predictive Search Overlay
 *
 * Full-screen overlay with debounced search input that calls the Shopify
 * predictive search API via a server action. Displays products with images
 * and prices, collections, and query suggestions.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface SearchResult {
  products: Array<{
    id: string
    title: string
    handle: string
    image?: { url: string; altText?: string }
    price: string
    compareAtPrice?: string
    currencyCode: string
  }>
  collections: Array<{
    id: string
    title: string
    handle: string
  }>
  queries: Array<{
    text: string
    styledText: string
  }>
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  searchAction: (query: string) => Promise<SearchResult | null>
}

export function SearchOverlay({ isOpen, onClose, searchAction }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (value.length < 2) {
      setResults(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    timerRef.current = setTimeout(async () => {
      const data = await searchAction(value)
      setResults(data)
      setIsLoading(false)
    }, 300)
  }, [searchAction])

  if (!isOpen) return null

  const hasResults = results && (
    results.products.length > 0 ||
    results.collections.length > 0 ||
    results.queries.length > 0
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />

      {/* Search Panel */}
      <div className="fixed inset-x-0 top-0 z-50 bg-white shadow-xl">
        <div className="mx-auto max-w-store px-4 py-4">
          {/* Search Input */}
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 border-none bg-transparent text-lg outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Close search"
            >
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Results */}
          {query.length >= 2 && (
            <div className="mt-4 max-h-[60vh] overflow-y-auto border-t border-gray-100 pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-cgk-navy border-t-transparent" />
                </div>
              ) : hasResults ? (
                <div className="space-y-6">
                  {/* Suggestions */}
                  {results.queries.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Suggestions</h3>
                      <ul className="space-y-1">
                        {results.queries.map((q, i) => (
                          <li key={i}>
                            <Link
                              href={`/search?q=${encodeURIComponent(q.text)}`}
                              onClick={onClose}
                              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-cgk-light-blue/20"
                            >
                              {q.text}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Products */}
                  {results.products.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Products</h3>
                      <ul className="space-y-1">
                        {results.products.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/products/${product.handle}`}
                              onClick={onClose}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cgk-light-blue/20"
                            >
                              {product.image && (
                                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                                  <Image
                                    src={product.image.url}
                                    alt={product.image.altText ?? product.title}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-cgk-navy">{product.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-cgk-navy">
                                    ${parseFloat(product.price).toFixed(2)}
                                  </span>
                                  {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                                    <span className="text-xs text-gray-400 line-through">
                                      ${parseFloat(product.compareAtPrice).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Collections */}
                  {results.collections.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Collections</h3>
                      <ul className="space-y-1">
                        {results.collections.map((collection) => (
                          <li key={collection.id}>
                            <Link
                              href={`/collections/${collection.handle}`}
                              onClick={onClose}
                              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-cgk-light-blue/20"
                            >
                              {collection.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* View All */}
                  <div className="border-t border-gray-100 pt-3">
                    <Link
                      href={`/search?q=${encodeURIComponent(query)}`}
                      onClick={onClose}
                      className="block text-center text-sm font-medium text-cgk-navy hover:underline"
                    >
                      View all results for &quot;{query}&quot;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  No results found for &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
