'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, cn } from '@cgk/ui'

import { useAttribution, ModelSelector, TimeRangePicker } from '@/components/attribution'
import type { CreativePerformance, CreativePlatform, CreativeSavedView } from '@/lib/attribution'

const platformColors: Record<CreativePlatform, string> = {
  meta: '#3b82f6',
  google: '#22c55e',
  tiktok: '#ef4444',
}

interface CreativeCardProps {
  creative: CreativePerformance
  isSelected: boolean
  onToggleSelect: (id: string) => void
}

function CreativeCard({ creative, isSelected, onToggleSelect }: CreativeCardProps) {
  return (
    <Card className={cn('relative overflow-hidden transition-all', isSelected && 'ring-2 ring-primary')}>
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(creative.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            creative.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          {creative.status}
        </span>
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: platformColors[creative.platform] }}
        >
          {creative.platform}
        </span>
      </div>

      <div className="aspect-video bg-muted relative">
        {creative.thumbnailUrl ? (
          <img
            src={creative.thumbnailUrl}
            alt={creative.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {creative.type === 'video' ? (
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h4 className="font-medium text-sm truncate mb-3">{creative.name}</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="font-semibold">${creative.revenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROAS</p>
            <p className={cn('font-semibold', creative.roas >= 3 ? 'text-green-600' : creative.roas >= 1 ? 'text-yellow-600' : 'text-red-600')}>
              {creative.roas.toFixed(2)}x
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conversions</p>
            <p className="font-semibold">{creative.conversions}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ComparisonModalProps {
  creatives: CreativePerformance[]
  onClose: () => void
}

function ComparisonModal({ creatives, onClose }: ComparisonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Compare Creatives ({creatives.length})</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {creatives.map((creative) => (
              <div key={creative.id} className="text-center">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                  {creative.thumbnailUrl ? (
                    <img
                      src={creative.thumbnailUrl}
                      alt={creative.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No preview
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{creative.name}</p>
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white mt-1"
                  style={{ backgroundColor: platformColors[creative.platform] }}
                >
                  {creative.platform}
                </span>
              </div>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Metric</th>
                {creatives.map((creative) => (
                  <th key={creative.id} className="p-3 text-right font-medium">
                    {creative.name.slice(0, 20)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium">Revenue</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    ${creative.revenue.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">ROAS</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    <span className={cn(creative.roas >= 3 ? 'text-green-600' : creative.roas >= 1 ? 'text-yellow-600' : 'text-red-600')}>
                      {creative.roas.toFixed(2)}x
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Spend</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    ${creative.spend.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Conversions</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">{creative.conversions}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Impressions</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    {creative.impressions.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Clicks</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">{creative.clicks.toLocaleString()}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">CTR</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">{creative.ctr.toFixed(2)}%</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">New Customer Revenue</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    ${creative.newCustomerRevenue.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Existing Customer Revenue</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">
                    ${creative.existingCustomerRevenue.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-medium">Visit Coverage</td>
                {creatives.map((creative) => (
                  <td key={creative.id} className="p-3 text-right">{creative.visitCoverage.toFixed(1)}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function CreativesPage() {
  const { model, window, startDate, endDate } = useAttribution()
  const [creatives, setCreatives] = useState<CreativePerformance[]>([])
  const [savedViews, setSavedViews] = useState<CreativeSavedView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'revenue' | 'roas' | 'conversions'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [hideInactive, setHideInactive] = useState(false)
  const [platforms, setPlatforms] = useState<CreativePlatform[]>([])
  const [newViewName, setNewViewName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const fetchCreatives = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        model,
        window,
        startDate,
        endDate,
        search,
        sortBy,
        sortOrder,
        hideInactive: hideInactive.toString(),
        platforms: platforms.join(','),
      })
      const response = await fetch(`/api/admin/attribution/creatives?${params}`)
      const data = await response.json()
      setCreatives(data.creatives || [])
    } catch (error) {
      console.error('Failed to fetch creatives:', error)
    } finally {
      setIsLoading(false)
    }
  }, [model, window, startDate, endDate, search, sortBy, sortOrder, hideInactive, platforms])

  const fetchSavedViews = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/creatives/saved-views')
      const data = await response.json()
      setSavedViews(data.savedViews || [])
    } catch (error) {
      console.error('Failed to fetch saved views:', error)
    }
  }, [])

  useEffect(() => {
    fetchCreatives()
  }, [fetchCreatives])

  useEffect(() => {
    fetchSavedViews()
  }, [fetchSavedViews])

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 6) {
        next.add(id)
      }
      return next
    })
  }

  const handleSaveView = async () => {
    if (!newViewName.trim()) return

    try {
      await fetch('/api/admin/attribution/creatives/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newViewName,
          filters: { search, sortBy, sortOrder, hideInactive, platforms },
        }),
      })
      setNewViewName('')
      setShowSaveDialog(false)
      fetchSavedViews()
    } catch (error) {
      console.error('Failed to save view:', error)
    }
  }

  const handleLoadView = (view: CreativeSavedView) => {
    setSearch(view.filters.search || '')
    setSortBy(view.filters.sortBy || 'revenue')
    setSortOrder(view.filters.sortOrder || 'desc')
    setHideInactive(view.filters.hideInactive || false)
    setPlatforms(view.filters.platforms || [])
  }

  const handleExportCsv = () => {
    const headers = ['Name', 'Platform', 'Type', 'Status', 'Spend', 'Revenue', 'ROAS', 'Conversions', 'Impressions', 'Clicks', 'CTR']
    const rows = creatives.map((c) => [
      c.name,
      c.platform,
      c.type,
      c.status,
      c.spend,
      c.revenue,
      c.roas,
      c.conversions,
      c.impressions,
      c.clicks,
      c.ctr,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creatives-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCreatives = creatives.filter((c) => selectedIds.has(c.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ModelSelector />
          <TimeRangePicker />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 1 && (
            <Button onClick={() => setShowComparison(true)}>
              Compare ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search creatives..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md w-64"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-1.5 text-sm border rounded-md"
        >
          <option value="revenue">Sort by Revenue</option>
          <option value="roas">Sort by ROAS</option>
          <option value="conversions">Sort by Conversions</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          {sortOrder === 'desc' ? '\u2193 Desc' : '\u2191 Asc'}
        </Button>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Hide inactive
        </label>

        <div className="flex gap-1">
          {(['meta', 'google', 'tiktok'] as CreativePlatform[]).map((platform) => (
            <Button
              key={platform}
              variant={platforms.includes(platform) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setPlatforms((prev) =>
                  prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
                )
              }}
              style={platforms.includes(platform) ? { backgroundColor: platformColors[platform] } : {}}
            >
              {platform}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {savedViews.length > 0 && (
            <select
              className="px-3 py-1.5 text-sm border rounded-md"
              onChange={(e) => {
                const view = savedViews.find((v) => v.id === e.target.value)
                if (view) handleLoadView(view)
              }}
              defaultValue=""
            >
              <option value="">Load saved view...</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
            Save View
          </Button>
        </div>
      </div>

      {showSaveDialog && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <input
              type="text"
              placeholder="View name"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md flex-1"
            />
            <Button size="sm" onClick={handleSaveView}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted animate-pulse rounded mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : creatives.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No creatives found for the selected filters
          </div>
        ) : (
          creatives.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              isSelected={selectedIds.has(creative.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>

      {showComparison && selectedCreatives.length > 1 && (
        <ComparisonModal creatives={selectedCreatives} onClose={() => setShowComparison(false)} />
      )}
    </div>
  )
}
