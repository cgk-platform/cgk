'use client'

import { Button, cn, Input } from '@cgk/ui'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { BrandsGrid } from '../../../components/dashboard/brands-grid'
import type { PaginatedBrands } from '../../../types/platform'

/**
 * Brands list page
 *
 * Displays all brands with:
 * - Search functionality
 * - Status filter tabs
 * - Paginated grid
 */
export default function BrandsPage() {
  const [brands, setBrands] = useState<PaginatedBrands | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'all' | 'active' | 'paused' | 'onboarding'>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Fetch brands with filters
  const fetchBrands = useCallback(
    async (pageNum: number) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          pageSize: '20',
        })

        if (status !== 'all') {
          params.set('status', status)
        }

        if (search) {
          params.set('search', search)
        }

        const response = await fetch(`/api/platform/overview/brands?${params}`)
        if (response.ok) {
          const result = await response.json()
          setBrands(result)
        }
      } catch (error) {
        console.error('Failed to fetch brands:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [status, search]
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    setPage(1)
    fetchBrands(1)
  }, [fetchBrands])

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchBrands(newPage)
    },
    [fetchBrands]
  )

  // Handle search submit
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }, [searchInput])

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'onboarding', label: 'Onboarding' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage all platform brands and their integrations.
          </p>
        </div>
        <Link href="/brands/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                status === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {/* Brands grid */}
      {brands ? (
        <BrandsGrid
          data={brands}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      ) : (
        <BrandsGrid
          data={{ brands: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }}
          page={1}
          onPageChange={() => {}}
          isLoading={true}
        />
      )}
    </div>
  )
}
