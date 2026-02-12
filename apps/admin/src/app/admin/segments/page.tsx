'use client'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn, Tabs, TabsContent, TabsList, TabsTrigger } from '@cgk/ui'
import { RefreshCw, Users, ChevronRight, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import { RFM_SEGMENT_INFO, type RfmSegmentType } from '@/lib/segments/types'

interface RfmSegmentStat {
  segment: RfmSegmentType
  label: string
  description: string
  color: string
  badgeColor: string
  count: number
  percentage: number
  avgMonetaryValue: number
  avgFrequency: number
  avgRecency: number
}

interface SegmentsData {
  shopify: Array<{
    id: string
    name: string
    type: 'shopify'
    memberCount: number
    query: string | null
    syncedAt: string
  }>
  rfm: Array<{
    id: string
    name: string
    type: 'rfm'
    memberCount: number
    description: string
    color: string
  }>
  rfmDistribution: {
    total: number
    calculatedAt: string | null
  }
}

interface RfmDistribution {
  type: 'distribution'
  total: number
  calculatedAt: string | null
  segments: RfmSegmentStat[]
}

export default function SegmentsPage() {
  const [activeTab, setActiveTab] = useState<'shopify' | 'rfm'>('rfm')
  const [segmentsData, setSegmentsData] = useState<SegmentsData | null>(null)
  const [rfmDistribution, setRfmDistribution] = useState<RfmDistribution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [segmentsRes, rfmRes] = await Promise.all([
        fetch('/api/admin/segments'),
        fetch('/api/admin/segments/rfm?view=distribution'),
      ])

      if (segmentsRes.ok) {
        const data = await segmentsRes.json()
        setSegmentsData(data)
      }

      if (rfmRes.ok) {
        const data = await rfmRes.json()
        setRfmDistribution(data)
      }
    } catch (error) {
      console.error('Failed to fetch segments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSyncShopify = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/admin/segments/shopify', { method: 'POST' })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to sync Shopify segments:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCalculateRfm = async () => {
    setIsCalculating(true)
    try {
      const res = await fetch('/api/admin/segments/rfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack: 365 }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to calculate RFM:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const getSegmentColor = (segment: RfmSegmentType): string => {
    return RFM_SEGMENT_INFO[segment]?.badgeColor || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Segments</h1>
          <p className="text-muted-foreground">Manage Shopify segments and RFM segmentation</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'shopify' | 'rfm')}>
        <TabsList>
          <TabsTrigger value="rfm">RFM Segments</TabsTrigger>
          <TabsTrigger value="shopify">Shopify Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="rfm" className="space-y-6">
          {/* RFM Overview Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>RFM Segmentation</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Customers segmented by Recency, Frequency, and Monetary value
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateRfm}
                disabled={isCalculating}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isCalculating && 'animate-spin')} />
                {isCalculating ? 'Calculating...' : 'Recalculate'}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : rfmDistribution ? (
                <div className="space-y-6">
                  {/* Stats row */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold">{formatNumber(rfmDistribution.total)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Segments</p>
                      <p className="text-2xl font-bold">{rfmDistribution.segments.length}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Last Calculated</p>
                      <p className="text-2xl font-bold">
                        {rfmDistribution.calculatedAt
                          ? formatDate(rfmDistribution.calculatedAt)
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Distribution chart (simple bar representation) */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Segment Distribution</h3>
                    {rfmDistribution.segments.map((seg) => (
                      <Link
                        key={seg.segment}
                        href={`/admin/segments/${seg.segment}?type=rfm`}
                        className="block group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-32 flex-shrink-0">
                            <Badge className={getSegmentColor(seg.segment)}>{seg.label}</Badge>
                          </div>
                          <div className="flex-1">
                            <div className="h-6 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.max(seg.percentage, 2)}%`,
                                  backgroundColor: seg.color,
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className="font-medium">{formatNumber(seg.count)}</span>
                            <span className="text-muted-foreground ml-1">
                              ({formatPercent(seg.percentage / 100)})
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Segment details table */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Segment</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Customers</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg. Spend</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg. Orders</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg. Recency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rfmDistribution.segments.map((seg) => (
                          <tr key={seg.segment} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Badge className={getSegmentColor(seg.segment)}>{seg.label}</Badge>
                                <span className="text-muted-foreground text-xs">{seg.description}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">{formatNumber(seg.count)}</td>
                            <td className="px-4 py-3 text-right">${seg.avgMonetaryValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">{seg.avgFrequency.toFixed(1)}</td>
                            <td className="px-4 py-3 text-right">{Math.round(seg.avgRecency)} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No RFM data</h3>
                  <p className="mt-2 text-muted-foreground">
                    Click "Recalculate" to analyze customer purchase patterns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Shopify Segments</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Customer segments synced from your Shopify store
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncShopify}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : segmentsData?.shopify && segmentsData.shopify.length > 0 ? (
                <div className="space-y-4">
                  {segmentsData.shopify.map((segment) => (
                    <Link
                      key={segment.id}
                      href={`/admin/segments/${segment.id}?type=shopify`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <h3 className="font-medium group-hover:text-primary">{segment.name}</h3>
                          {segment.query && (
                            <p className="text-sm text-muted-foreground truncate max-w-md">
                              {segment.query}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {formatNumber(segment.memberCount)}
                            </p>
                            <p className="text-xs text-muted-foreground">members</p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Synced</p>
                            <p>{formatDate(segment.syncedAt)}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Shopify segments</h3>
                  <p className="mt-2 text-muted-foreground">
                    Click "Sync Now" to fetch segments from your Shopify store
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
