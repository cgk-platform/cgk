'use client'

import { Badge, Button, Card, CardContent, Input, Label, Switch, Tabs, TabsList, TabsTrigger } from '@cgk/ui'
import { ChevronLeft, ChevronRight, ExternalLink, Package, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatDate, formatMoney } from '@/lib/format'
import {
  FULFILLMENT_STATUS_INFO,
  SAMPLE_TYPE_INFO,
  type FulfillmentStatus,
  type SampleType,
} from '@/lib/samples/types'

interface SampleOrder {
  orderId: string
  orderNumber: string
  customerEmail: string | null
  customerName: string | null
  totalPrice: number
  currency: string
  fulfillmentStatus: FulfillmentStatus
  tags: string[]
  channel: string | null
  orderPlacedAt: string
  sampleType: SampleType
}

interface SamplesStats {
  total: number
  byType: {
    ugc: number
    tiktok: number
    unknown: number
  }
  byFulfillment: {
    unfulfilled: number
    partial: number
    fulfilled: number
  }
}

interface SamplesConfig {
  id: string | null
  ugcTags: string[]
  tiktokTags: string[]
  channelPatterns: string[]
  zeroPriceOnly: boolean
  enabled: boolean
  updatedAt: string | null
}

export default function SamplesOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'ugc' | 'tiktok'>('all')
  const [samples, setSamples] = useState<SampleOrder[]>([])
  const [stats, setStats] = useState<SamplesStats | null>(null)
  const [config, setConfig] = useState<SamplesConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentStatus | ''>('')
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Settings form state
  const [ugcTagInput, setUgcTagInput] = useState('')
  const [tiktokTagInput, setTiktokTagInput] = useState('')
  const [channelPatternInput, setChannelPatternInput] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const fetchSamples = async (page: number = 1) => {
    setIsLoading(true)
    try {
      const type = activeTab === 'all' ? '' : activeTab
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(type && { type }),
        ...(fulfillmentFilter && { fulfillmentStatus: fulfillmentFilter }),
        ...(search && { search }),
      })

      const res = await fetch(`/api/admin/samples/orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSamples(data.samples)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch samples:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/samples/orders/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/samples/settings')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }

  useEffect(() => {
    fetchSamples(1)
    fetchStats()
    fetchConfig()
  }, [])

  useEffect(() => {
    fetchSamples(1)
  }, [activeTab, fulfillmentFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSamples(1)
  }

  const handleSaveSettings = async () => {
    if (!config) return
    setIsSavingSettings(true)

    try {
      const res = await fetch('/api/admin/samples/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ugcTags: config.ugcTags,
          tiktokTags: config.tiktokTags,
          channelPatterns: config.channelPatterns,
          zeroPriceOnly: config.zeroPriceOnly,
          enabled: config.enabled,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setShowSettings(false)
        fetchSamples(1)
        fetchStats()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const addTag = (type: 'ugc' | 'tiktok' | 'channel', value: string) => {
    if (!config || !value.trim()) return
    const newConfig = { ...config }

    if (type === 'ugc' && !newConfig.ugcTags.includes(value.trim())) {
      newConfig.ugcTags = [...newConfig.ugcTags, value.trim()]
      setUgcTagInput('')
    } else if (type === 'tiktok' && !newConfig.tiktokTags.includes(value.trim())) {
      newConfig.tiktokTags = [...newConfig.tiktokTags, value.trim()]
      setTiktokTagInput('')
    } else if (type === 'channel' && !newConfig.channelPatterns.includes(value.trim())) {
      newConfig.channelPatterns = [...newConfig.channelPatterns, value.trim()]
      setChannelPatternInput('')
    }

    setConfig(newConfig)
  }

  const removeTag = (type: 'ugc' | 'tiktok' | 'channel', value: string) => {
    if (!config) return
    const newConfig = { ...config }

    if (type === 'ugc') {
      newConfig.ugcTags = newConfig.ugcTags.filter((t) => t !== value)
    } else if (type === 'tiktok') {
      newConfig.tiktokTags = newConfig.tiktokTags.filter((t) => t !== value)
    } else if (type === 'channel') {
      newConfig.channelPatterns = newConfig.channelPatterns.filter((t) => t !== value)
    }

    setConfig(newConfig)
  }

  const getSampleTypeBadge = (type: SampleType) => {
    const info = SAMPLE_TYPE_INFO[type]
    return <Badge className={info.badgeColor}>{info.label}</Badge>
  }

  const getFulfillmentBadge = (status: FulfillmentStatus) => {
    const info = FULFILLMENT_STATUS_INFO[status]
    return <Badge className={info.badgeColor}>{info.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sample Orders</h1>
          <p className="text-muted-foreground">Orders detected as UGC or TikTok samples</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Samples</p>
            <p className="mt-1 text-2xl font-semibold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">UGC Samples</p>
            <p className="mt-1 text-2xl font-semibold text-purple-600">{stats?.byType.ugc || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">TikTok Samples</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-600">{stats?.byType.tiktok || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending Fulfillment</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{stats?.byFulfillment.unfulfilled || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ugc">UGC</TabsTrigger>
            <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          className="h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
          value={fulfillmentFilter}
          onChange={(e) => setFulfillmentFilter(e.target.value as FulfillmentStatus | '')}
        >
          <option value="">All Fulfillment</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="partial">Partial</option>
          <option value="fulfilled">Fulfilled</option>
        </select>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : samples.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No sample orders found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders matching your tag configuration will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fulfillment</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {samples.map((sample) => (
                      <tr key={sample.orderId} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/commerce/orders/${sample.orderId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            #{sample.orderNumber}
                          </Link>
                          {sample.channel && (
                            <p className="text-xs text-muted-foreground">{sample.channel}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{sample.customerName || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{sample.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3">{getSampleTypeBadge(sample.sampleType)}</td>
                        <td className="px-4 py-3">{getFulfillmentBadge(sample.fulfillmentStatus)}</td>
                        <td className="px-4 py-3 text-right">
                          {formatMoney(sample.totalPrice * 100, sample.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatDate(sample.orderPlacedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/commerce/orders/${sample.orderId}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSamples(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSamples(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {showSettings && config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Sample Detection Settings</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* UGC Tags */}
              <div className="space-y-3">
                <Label>UGC Tags</Label>
                <p className="text-sm text-muted-foreground">Orders with these tags are classified as UGC samples</p>
                <div className="flex flex-wrap gap-2">
                  {config.ugcTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag('ugc', tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={ugcTagInput}
                    onChange={(e) => setUgcTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('ugc', ugcTagInput))}
                  />
                  <Button variant="secondary" size="sm" onClick={() => addTag('ugc', ugcTagInput)}>
                    Add
                  </Button>
                </div>
              </div>

              {/* TikTok Tags */}
              <div className="space-y-3">
                <Label>TikTok Tags</Label>
                <p className="text-sm text-muted-foreground">Orders with these tags are classified as TikTok samples</p>
                <div className="flex flex-wrap gap-2">
                  {config.tiktokTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag('tiktok', tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={tiktokTagInput}
                    onChange={(e) => setTiktokTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('tiktok', tiktokTagInput))}
                  />
                  <Button variant="secondary" size="sm" onClick={() => addTag('tiktok', tiktokTagInput)}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Channel Patterns */}
              <div className="space-y-3 md:col-span-2">
                <Label>Channel Patterns</Label>
                <p className="text-sm text-muted-foreground">
                  Orders from channels matching these patterns are classified as TikTok samples.
                  Use % as a wildcard (e.g., "tiktok%" matches "tiktok shop")
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.channelPatterns.map((pattern) => (
                    <Badge key={pattern} variant="secondary" className="gap-1">
                      {pattern}
                      <button onClick={() => removeTag('channel', pattern)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add pattern..."
                    value={channelPatternInput}
                    onChange={(e) => setChannelPatternInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('channel', channelPatternInput))}
                  />
                  <Button variant="secondary" size="sm" onClick={() => addTag('channel', channelPatternInput)}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Zero-price orders only</Label>
                    <p className="text-sm text-muted-foreground">Only detect samples from orders with $0 total</p>
                  </div>
                  <Switch
                    checked={config.zeroPriceOnly}
                    onCheckedChange={(checked) => setConfig({ ...config, zeroPriceOnly: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable sample detection</Label>
                    <p className="text-sm text-muted-foreground">Turn off to disable sample order detection</p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
