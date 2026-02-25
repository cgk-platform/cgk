import { useMemo, useState } from 'react'

type SortDir = 'asc' | 'desc'

interface UseTableFilterOptions<T> {
  data: T[]
  searchFields: (keyof T)[]
  defaultSort?: keyof T
  defaultSortDir?: SortDir
  filterFn?: (item: T, filters: Record<string, string>) => boolean
}

interface UseTableFilterResult<T> {
  filtered: T[]
  search: string
  setSearch: (value: string) => void
  sortKey: keyof T | null
  sortDir: SortDir
  setSort: (key: keyof T) => void
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
}

export function useTableFilter<T extends Record<string, unknown>>({
  data,
  searchFields,
  defaultSort,
  defaultSortDir = 'asc',
  filterFn,
}: UseTableFilterOptions<T>): UseTableFilterResult<T> {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSort ?? null)
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const setSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  const clearFilters = () => {
    setSearch('')
    setFilters({})
  }

  const filtered = useMemo(() => {
    let result = [...data]

    // Text search
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field]
          return typeof val === 'string' && val.toLowerCase().includes(lower)
        })
      )
    }

    // Custom filters
    if (filterFn && Object.keys(filters).length > 0) {
      result = result.filter((item) => filterFn(item, filters))
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        let cmp = 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          cmp = aVal.localeCompare(bVal)
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0)
        }
        return sortDir === 'desc' ? -cmp : cmp
      })
    }

    return result
  }, [data, search, searchFields, sortKey, sortDir, filters, filterFn])

  return {
    filtered,
    search,
    setSearch,
    sortKey,
    sortDir,
    setSort,
    filters,
    setFilter,
    clearFilters,
  }
}
