'use client'

import { Button, cn } from '@cgk/ui'
import { Grid, List, Plus, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

import type { AssetRow, Collection, AssetFilters, BulkOperation } from '@cgk/dam'
import {
  AssetCard,
  AssetDetailModal,
  BulkActionsBar,
  CollectionSidebar,
  SearchBar,
  type SearchFilters,
} from '@/components/admin/dam'

interface AssetLibraryClientProps {
  initialAssets: AssetRow[]
  totalCount: number
  collections: Collection[]
  stats: {
    total: number
    by_type: Record<string, number>
    total_size_bytes: number
    favorites: number
    archived: number
  }
  filters: AssetFilters
}

export function AssetLibraryClient({
  initialAssets,
  totalCount,
  collections,
  stats,
  filters,
}: AssetLibraryClientProps) {
  const router = useRouter()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [assets, setAssets] = useState(initialAssets)
  const [isLoading, setIsLoading] = useState(false)

  // Search filters state
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: filters.search || '',
    assetTypes: filters.asset_type ? [filters.asset_type as any] : [],
    tags: filters.tags || [],
    dateFrom: filters.date_from,
    dateTo: filters.date_to,
    isArchived: filters.is_archived,
    isFavorite: filters.is_favorite,
  })

  // Handle search
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams()

    if (searchFilters.query) params.set('search', searchFilters.query)
    if (searchFilters.assetTypes.length > 0 && searchFilters.assetTypes[0]) params.set('type', searchFilters.assetTypes[0])
    if (searchFilters.tags.length > 0) params.set('tags', searchFilters.tags.join(','))
    if (searchFilters.dateFrom) params.set('from', searchFilters.dateFrom)
    if (searchFilters.dateTo) params.set('to', searchFilters.dateTo)
    if (searchFilters.isArchived) params.set('filter', 'archived')
    if (searchFilters.isFavorite) params.set('filter', 'favorites')

    router.push(`/admin/dam?${params.toString()}`)
  }, [searchFilters, router])

  // Handle asset selection
  const handleSelect = useCallback((assetId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(assetId)
      } else {
        next.delete(assetId)
      }
      return next
    })
  }, [])

  // Handle asset click
  const handleAssetClick = useCallback((asset: AssetRow) => {
    setSelectedAsset(asset)
    setIsModalOpen(true)
  }, [])

  // Handle modal navigation
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedAsset) return

    const currentIndex = assets.findIndex(a => a.id === selectedAsset.id)
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1

    if (newIndex >= 0 && newIndex < assets.length) {
      const nextAsset = assets[newIndex]
      if (nextAsset) setSelectedAsset(nextAsset)
    }
  }, [selectedAsset, assets])

  // Handle favorite toggle
  const handleFavorite = useCallback(async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return

    try {
      const response = await fetch(`/api/admin/dam/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !asset.is_favorite }),
      })

      if (response.ok) {
        setAssets(prev => prev.map(a =>
          a.id === assetId ? { ...a, is_favorite: !a.is_favorite } : a
        ))
        if (selectedAsset?.id === assetId) {
          setSelectedAsset((prev: AssetRow | null) => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }, [assets, selectedAsset])

  // Handle delete
  const handleDelete = useCallback(async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      const response = await fetch(`/api/admin/dam/assets/${assetId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== assetId))
        if (selectedAsset?.id === assetId) {
          setIsModalOpen(false)
          setSelectedAsset(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }, [selectedAsset])

  // Handle bulk operation
  const handleBulkOperation = useCallback(async (operation: BulkOperation, options?: Record<string, unknown>) => {
    if (selectedIds.size === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dam/assets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          asset_ids: Array.from(selectedIds),
          ...options,
        }),
      })

      if (response.ok) {
        // Refresh the page to get updated data
        router.refresh()
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedIds, router])

  // Handle save from modal
  const handleSave = useCallback(async (updates: Partial<AssetRow>) => {
    if (!selectedAsset) return

    try {
      const response = await fetch(`/api/admin/dam/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const { asset } = await response.json()
        setAssets(prev => prev.map(a => a.id === asset.id ? asset : a))
        setSelectedAsset(asset)
      }
    } catch (error) {
      console.error('Failed to save asset:', error)
    }
  }, [selectedAsset])

  const currentIndex = selectedAsset ? assets.findIndex(a => a.id === selectedAsset.id) : -1

  return (
    <>
      {/* Sidebar */}
      <CollectionSidebar
        collections={collections}
        assetStats={{
          total: stats.total,
          favorites: stats.favorites,
          archived: stats.archived,
          recent: stats.total,
        }}
        onCreateCollection={() => {
          // Create collection modal
        }}
      />

      {/* Main content */}
      <main className="flex flex-1 flex-col bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex-1">
            <SearchBar
              value={searchFilters}
              onChange={setSearchFilters}
              onSearch={handleSearch}
              availableTags={[]}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Upload button */}
            <Button asChild>
              <Link href="/admin/dam/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>

        {/* Assets grid/list */}
        <div className="flex-1 overflow-y-auto p-4">
          {assets.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-slate-800 p-6">
                <Upload className="h-12 w-12 text-slate-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-200">No assets yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Upload your first asset to get started
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/dam/upload">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Assets
                </Link>
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {assets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedIds.has(asset.id)}
                  onSelect={handleSelect}
                  onClick={handleAssetClick}
                  onFavorite={handleFavorite}
                  onDelete={handleDelete}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedIds.has(asset.id)}
                  onSelect={handleSelect}
                  onClick={handleAssetClick}
                  onFavorite={handleFavorite}
                  onDelete={handleDelete}
                  viewMode="list"
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > filters.limit && (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalCount)} of {totalCount} assets
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => router.push(`/admin/dam?page=${filters.page - 1}`)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.offset + filters.limit >= totalCount}
                onClick={() => router.push(`/admin/dam?page=${filters.page + 1}`)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClose={() => setSelectedIds(new Set())}
        onAction={handleBulkOperation}
        collections={collections.map(c => ({ id: c.id, name: c.name }))}
        isLoading={isLoading}
      />

      {/* Asset detail modal */}
      <AssetDetailModal
        asset={selectedAsset}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onFavorite={handleFavorite}
        onNavigate={handleNavigate}
        hasNext={currentIndex < assets.length - 1}
        hasPrev={currentIndex > 0}
        collections={selectedAsset ? collections.filter(c =>
          selectedAsset.collection_names?.includes(c.name)
        ) : []}
      />
    </>
  )
}
