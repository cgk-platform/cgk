'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import { ChevronRight, Mail, Search, ShoppingCart, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAttribution } from '@/components/attribution'
import type {
  AttributionModel,
  AttributionWindow,
  CustomerJourney,
  JourneyTouchpoint,
  PathAnalysis,
} from '@/lib/attribution'
import { ATTRIBUTION_MODELS, ATTRIBUTION_WINDOWS } from '@/lib/attribution'

// ============================================================
// Journey List Component
// ============================================================

interface JourneyListProps {
  journeys: CustomerJourney[]
  selectedId: string | null
  onSelect: (journey: CustomerJourney) => void
}

function JourneyList({ journeys, selectedId, onSelect }: JourneyListProps) {
  if (journeys.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No journeys found for the selected filters.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {journeys.map((journey) => (
        <button
          key={journey.conversionId}
          onClick={() => onSelect(journey)}
          className={cn(
            'flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50',
            selectedId === journey.conversionId && 'bg-muted'
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Order #{journey.orderNumber}</span>
              {journey.isNewCustomer && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{journey.customerEmail}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">${journey.orderTotal.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              {journey.touchpointCount} touchpoint{journey.touchpointCount !== 1 ? 's' : ''}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Journey Timeline Component
// ============================================================

interface JourneyTimelineProps {
  touchpoints: JourneyTouchpoint[]
  selectedModel: AttributionModel
}

function getChannelIcon(channel: string) {
  const lowerChannel = channel.toLowerCase()
  if (lowerChannel.includes('meta') || lowerChannel.includes('facebook')) return 'M'
  if (lowerChannel.includes('google')) return 'G'
  if (lowerChannel.includes('tiktok')) return 'T'
  if (lowerChannel.includes('email')) return 'E'
  if (lowerChannel.includes('direct')) return 'D'
  return channel.charAt(0).toUpperCase()
}

function getChannelColor(channel: string) {
  const lowerChannel = channel.toLowerCase()
  if (lowerChannel.includes('meta') || lowerChannel.includes('facebook'))
    return 'bg-blue-500 text-white'
  if (lowerChannel.includes('google')) return 'bg-red-500 text-white'
  if (lowerChannel.includes('tiktok')) return 'bg-black text-white'
  if (lowerChannel.includes('email')) return 'bg-purple-500 text-white'
  if (lowerChannel.includes('direct')) return 'bg-gray-500 text-white'
  return 'bg-emerald-500 text-white'
}

function JourneyTimeline({ touchpoints, selectedModel }: JourneyTimelineProps) {
  if (touchpoints.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No touchpoints found.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-4">
      {touchpoints.map((touchpoint, index) => {
        const credit = touchpoint.creditByModel[selectedModel] ?? 0
        const isLast = index === touchpoints.length - 1

        const prevTime = index > 0 ? new Date(touchpoints[index - 1]!.timestamp) : null
        const currTime = new Date(touchpoint.timestamp)
        const timeDiff = prevTime
          ? Math.round((currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60))
          : null

        return (
          <div key={touchpoint.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold',
                  getChannelColor(touchpoint.channel)
                )}
                title={touchpoint.channel}
              >
                {getChannelIcon(touchpoint.channel)}
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs font-medium">{touchpoint.channel}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(touchpoint.timestamp).toLocaleDateString()}
                </div>
                <div className="mt-1 text-xs font-medium text-emerald-600">{credit}% credit</div>
              </div>
            </div>
            {!isLast && (
              <div className="mx-2 flex flex-col items-center">
                <div className="h-0.5 w-8 bg-muted-foreground/30" />
                {timeDiff !== null && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {timeDiff < 24 ? `${timeDiff}h` : `${Math.round(timeDiff / 24)}d`}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// Journey Detail Panel
// ============================================================

interface JourneyDetailPanelProps {
  journey: CustomerJourney
  onClose: () => void
}

function JourneyDetailPanel({ journey, onClose }: JourneyDetailPanelProps) {
  const [selectedModel, setSelectedModel] = useState<AttributionModel>('time_decay')

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-background shadow-xl sm:w-[600px]">
      <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
        <div>
          <h2 className="text-lg font-semibold">Order #{journey.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">{journey.customerEmail}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Order Value</div>
                <div className="text-lg font-semibold">${journey.orderTotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Customer Type</div>
                <div className="text-lg font-semibold">
                  {journey.isNewCustomer ? 'New' : 'Returning'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Touchpoints</div>
                <div className="text-lg font-semibold">{journey.touchpointCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Conversion Date</div>
                <div className="text-lg font-semibold">
                  {new Date(journey.conversionDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Customer Journey</h3>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AttributionModel)}
              className="rounded border px-2 py-1 text-sm"
            >
              {ATTRIBUTION_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <Card>
            <CardContent className="p-4">
              <JourneyTimeline touchpoints={journey.touchpoints} selectedModel={selectedModel} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Touchpoint Details</h3>
          <div className="space-y-2">
            {journey.touchpoints.map((touchpoint) => (
              <Card key={touchpoint.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                          getChannelColor(touchpoint.channel)
                        )}
                      >
                        {getChannelIcon(touchpoint.channel)}
                      </div>
                      <div>
                        <div className="font-medium">{touchpoint.channel}</div>
                        {touchpoint.campaign && (
                          <div className="text-sm text-muted-foreground">{touchpoint.campaign}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{new Date(touchpoint.timestamp).toLocaleString()}</div>
                      <div className="text-muted-foreground">{touchpoint.device}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {touchpoint.platform && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {touchpoint.platform}
                      </span>
                    )}
                    {touchpoint.adSet && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        Ad Set: {touchpoint.adSet}
                      </span>
                    )}
                    {touchpoint.ad && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        Ad: {touchpoint.ad}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Path Analysis Summary
// ============================================================

interface PathAnalysisSummaryProps {
  pathAnalysis: PathAnalysis | null
  isLoading: boolean
}

function PathAnalysisSummary({ pathAnalysis, isLoading }: PathAnalysisSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!pathAnalysis) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg. Touchpoints</div>
            <div className="text-2xl font-bold">{pathAnalysis.avgTouchpoints.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg. Time to Conversion</div>
            <div className="text-2xl font-bold">
              {pathAnalysis.avgTimeToConversion < 24
                ? `${pathAnalysis.avgTimeToConversion.toFixed(0)}h`
                : `${(pathAnalysis.avgTimeToConversion / 24).toFixed(1)}d`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Most Common Path</div>
            <div className="text-lg font-bold">
              {pathAnalysis.commonPaths[0]?.path.join(' > ') || 'N/A'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Common Paths</div>
            <div className="text-2xl font-bold">{pathAnalysis.commonPaths.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-4 font-semibold">Top Conversion Paths</h3>
          <div className="space-y-2">
            {pathAnalysis.commonPaths.slice(0, 5).map((path, index) => (
              <div key={index} className="flex items-center justify-between rounded bg-muted/50 p-3">
                <div className="flex items-center gap-1">
                  {path.path.map((channel, i) => (
                    <span key={i} className="flex items-center">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-sm font-medium',
                          getChannelColor(channel)
                        )}
                      >
                        {channel}
                      </span>
                      {i < path.path.length - 1 && (
                        <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                  ))}
                </div>
                <div className="text-right">
                  <div className="font-medium">{path.count} conversions</div>
                  <div className="text-sm text-muted-foreground">
                    ${path.avgOrderValue.toLocaleString()} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Main Journeys Page
// ============================================================

export default function JourneysPage() {
  const { window } = useAttribution()
  const [journeys, setJourneys] = useState<CustomerJourney[]>([])
  const [total, setTotal] = useState(0)
  const [selectedJourney, setSelectedJourney] = useState<CustomerJourney | null>(null)
  const [pathAnalysis, setPathAnalysis] = useState<PathAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPathLoading, setIsPathLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [customerType, setCustomerType] = useState<'all' | 'new' | 'returning'>('all')
  const [selectedWindow, setSelectedWindow] = useState<AttributionWindow>(window)

  const fetchJourneys = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        window: selectedWindow,
        customerType,
        limit: '50',
      })
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/attribution/journeys?${params}`)
      const data = await response.json()
      setJourneys(data.journeys ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      console.error('Failed to fetch journeys:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedWindow, customerType, search])

  const fetchPathAnalysis = useCallback(async () => {
    setIsPathLoading(true)
    try {
      const response = await fetch(`/api/admin/attribution/journeys/paths?window=${selectedWindow}`)
      const data = await response.json()
      setPathAnalysis(data.pathAnalysis ?? null)
    } catch (error) {
      console.error('Failed to fetch path analysis:', error)
    } finally {
      setIsPathLoading(false)
    }
  }, [selectedWindow])

  useEffect(() => {
    fetchJourneys()
    fetchPathAnalysis()
  }, [fetchJourneys, fetchPathAnalysis])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Customer Journeys</h2>
        <p className="text-sm text-muted-foreground">
          Visualize customer touchpoint paths leading to conversions
        </p>
      </div>

      <PathAnalysisSummary pathAnalysis={pathAnalysis} isLoading={isPathLoading} />

      <Card>
        <div className="border-b p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by order ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border py-2 pl-10 pr-4 text-sm"
              />
            </div>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as typeof customerType)}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="all">All Customers</option>
              <option value="new">New Customers</option>
              <option value="returning">Returning Customers</option>
            </select>
            <select
              value={selectedWindow}
              onChange={(e) => setSelectedWindow(e.target.value as AttributionWindow)}
              className="rounded border px-3 py-2 text-sm"
            >
              {ATTRIBUTION_WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label} Window
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <JourneyList
            journeys={journeys}
            selectedId={selectedJourney?.conversionId ?? null}
            onSelect={setSelectedJourney}
          />
        )}

        {!isLoading && (
          <div className="border-t p-4 text-sm text-muted-foreground">
            Showing {journeys.length} of {total} journeys
          </div>
        )}
      </Card>

      {selectedJourney && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelectedJourney(null)}
          />
          <JourneyDetailPanel journey={selectedJourney} onClose={() => setSelectedJourney(null)} />
        </>
      )}
    </div>
  )
}
