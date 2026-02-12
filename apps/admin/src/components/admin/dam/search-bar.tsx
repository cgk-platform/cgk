'use client'

import { Button, cn, Input } from '@cgk/ui'
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Calendar,
  Tag,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Check,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AssetType } from '@cgk/dam'

export interface SearchFilters {
  query: string
  assetTypes: AssetType[]
  tags: string[]
  dateFrom?: string
  dateTo?: string
  isArchived?: boolean
  isFavorite?: boolean
}

export interface SearchBarProps {
  value: SearchFilters
  onChange: (filters: SearchFilters) => void
  onSearch: () => void
  availableTags?: string[]
  placeholder?: string
}

const assetTypeOptions: { value: AssetType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'image', label: 'Images', icon: FileImage },
  { value: 'video', label: 'Videos', icon: FileVideo },
  { value: 'audio', label: 'Audio', icon: FileAudio },
  { value: 'document', label: 'Documents', icon: FileText },
]

export function SearchBar({
  value,
  onChange,
  onSearch,
  availableTags = [],
  placeholder = 'Search assets...',
}: SearchBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter tag suggestions
  useEffect(() => {
    if (tagInput.length >= 2) {
      const filtered = availableTags
        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()))
        .filter(t => !value.tags.includes(t))
        .slice(0, 5)
      setTagSuggestions(filtered)
    } else {
      setTagSuggestions([])
    }
  }, [tagInput, availableTags, value.tags])

  const handleQueryChange = useCallback((query: string) => {
    onChange({ ...value, query })
  }, [value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch()
    }
  }, [onSearch])

  const toggleAssetType = useCallback((type: AssetType) => {
    const types = value.assetTypes.includes(type)
      ? value.assetTypes.filter(t => t !== type)
      : [...value.assetTypes, type]
    onChange({ ...value, assetTypes: types })
  }, [value, onChange])

  const addTag = useCallback((tag: string) => {
    if (!value.tags.includes(tag)) {
      onChange({ ...value, tags: [...value.tags, tag] })
    }
    setTagInput('')
    setTagSuggestions([])
  }, [value, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange({ ...value, tags: value.tags.filter(t => t !== tag) })
  }, [value, onChange])

  const clearFilters = useCallback(() => {
    onChange({
      query: value.query,
      assetTypes: [],
      tags: [],
      dateFrom: undefined,
      dateTo: undefined,
      isArchived: undefined,
      isFavorite: undefined,
    })
  }, [value.query, onChange])

  const hasFilters = value.assetTypes.length > 0 ||
    value.tags.length > 0 ||
    value.dateFrom ||
    value.dateTo ||
    value.isArchived !== undefined ||
    value.isFavorite !== undefined

  const activeFilterCount = [
    value.assetTypes.length > 0,
    value.tags.length > 0,
    value.dateFrom || value.dateTo,
    value.isArchived !== undefined,
    value.isFavorite !== undefined,
  ].filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={value.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-10 bg-slate-900 border-slate-700 focus:border-amber-500"
          />
          {value.query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter button */}
        <div className="relative" ref={filterRef}>
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              'gap-2',
              isFilterOpen && 'border-amber-500 bg-amber-500/10'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-slate-900">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              isFilterOpen && 'rotate-180'
            )} />
          </Button>

          {/* Filter dropdown */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
              {/* Asset types */}
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Asset Type
                </h4>
                <div className="flex flex-wrap gap-2">
                  {assetTypeOptions.map(({ value: type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => toggleAssetType(type)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        value.assetTypes.includes(type)
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tags
                </h4>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput) {
                        addTag(tagInput)
                      }
                    }}
                    placeholder="Add tag..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />

                  {/* Tag suggestions */}
                  {tagSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-slate-700 bg-slate-800 py-1">
                      {tagSuggestions.map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          <Tag className="h-3 w-3 text-slate-500" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tags */}
                {value.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {value.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-amber-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Date range */}
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date Range
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      value={value.dateFrom || ''}
                      onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      value={value.dateTo || ''}
                      onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Quick filters */}
              <div className="mb-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Quick Filters
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onChange({ ...value, isFavorite: value.isFavorite ? undefined : true })}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      value.isFavorite
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {value.isFavorite && <Check className="h-3.5 w-3.5" />}
                    Favorites
                  </button>
                  <button
                    onClick={() => onChange({ ...value, isArchived: value.isArchived ? undefined : true })}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      value.isArchived
                        ? 'bg-slate-500/20 text-slate-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {value.isArchived && <Check className="h-3.5 w-3.5" />}
                    Archived
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="text-sm text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  Clear all
                </button>
                <Button size="sm" onClick={() => { onSearch(); setIsFilterOpen(false) }}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Search button */}
        <Button onClick={onSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Active filters:</span>

          {value.assetTypes.map(type => (
            <span
              key={type}
              className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
            >
              {type}
              <button onClick={() => toggleAssetType(type)} className="hover:text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {value.tags.map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400"
            >
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-amber-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {(value.dateFrom || value.dateTo) && (
            <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {value.dateFrom || 'Any'} - {value.dateTo || 'Any'}
              <button
                onClick={() => onChange({ ...value, dateFrom: undefined, dateTo: undefined })}
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {value.isFavorite && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-400">
              Favorites
              <button onClick={() => onChange({ ...value, isFavorite: undefined })} className="hover:text-rose-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {value.isArchived && (
            <span className="flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
              Archived
              <button onClick={() => onChange({ ...value, isArchived: undefined })} className="hover:text-slate-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
