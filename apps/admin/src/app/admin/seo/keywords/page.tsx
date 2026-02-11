'use client'

import { Button, Card, CardContent, CardHeader, Input, Label } from '@cgk/ui'
import { Plus, RefreshCw, Download, Search, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

import { SEONav } from '@/components/admin/seo/SEONav'
import { TrendBadge } from '@/components/admin/seo/KeywordChart'
import type {
  SEOKeywordWithTrend,
  CreateKeywordInput,
  KeywordPriority,
} from '@/lib/seo/types'

export default function KeywordsPage() {
  const searchParams = useSearchParams()

  const [keywords, setKeywords] = useState<SEOKeywordWithTrend[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [priority, setPriority] = useState(searchParams.get('priority') || '')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))

  const [newKeyword, setNewKeyword] = useState<CreateKeywordInput>({
    keyword: '',
    priority: 'medium',
    target_url: '',
  })

  const fetchKeywords = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(priority && { priority }),
      })

      const res = await fetch(`/api/admin/seo/keywords?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setKeywords(data.keywords)
      setTotalCount(data.pagination.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch keywords')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, priority])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/seo/keywords/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setSuccess(`Synced ${data.synced} keywords from Google Search Console`)
      fetchKeywords()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCreate = async () => {
    if (!newKeyword.keyword.trim()) {
      setError('Keyword is required')
      return
    }

    try {
      const res = await fetch('/api/admin/seo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyword),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setIsModalOpen(false)
      setNewKeyword({ keyword: '', priority: 'medium', target_url: '' })
      fetchKeywords()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create keyword')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this keyword?')) return

    try {
      const res = await fetch(`/api/admin/seo/keywords?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      fetchKeywords()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keyword')
    }
  }

  const handleExport = () => {
    window.location.href = '/api/admin/seo/keywords?export=csv'
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keyword Tracking</h1>
          <p className="text-muted-foreground">
            Track keyword rankings and sync with Google Search Console
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync GSC'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Keyword
          </Button>
        </div>
      </div>

      <SEONav />

      {/* Alerts */}
      {error && (
        <div className="flex items-center justify-between rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between rounded-md border border-green-500 bg-green-50 p-4 text-green-700">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value)
            setPage(1)
          }}
          className="rounded-md border bg-background px-3 py-2"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keywords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No keywords tracked</p>
              <p className="text-muted-foreground">Add keywords to start tracking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Keyword</th>
                    <th className="p-4 font-medium">Priority</th>
                    <th className="p-4 font-medium text-right">Position</th>
                    <th className="p-4 font-medium text-right">Clicks</th>
                    <th className="p-4 font-medium text-right">Impressions</th>
                    <th className="p-4 font-medium">7d Trend</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keywords.map((kw) => (
                    <tr key={kw.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <p className="font-medium">{kw.keyword}</p>
                        {kw.target_url && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {kw.target_url}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          kw.priority === 'high' ? 'bg-red-100 text-red-800' :
                          kw.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {kw.priority}
                        </span>
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {kw.current_position?.toFixed(1) ?? '-'}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {kw.clicks.toLocaleString()}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {kw.impressions.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <TrendBadge trend={kw.trend_7d} change={kw.position_change_7d} />
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(kw.id)}
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold">Add Keyword</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                  placeholder="e.g., best coffee maker"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={newKeyword.priority}
                  onChange={(e) => setNewKeyword({ ...newKeyword, priority: e.target.value as KeywordPriority })}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target URL (optional)</Label>
                <Input
                  id="target"
                  value={newKeyword.target_url || ''}
                  onChange={(e) => setNewKeyword({ ...newKeyword, target_url: e.target.value })}
                  placeholder="/blog/best-coffee-makers"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Add Keyword
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
