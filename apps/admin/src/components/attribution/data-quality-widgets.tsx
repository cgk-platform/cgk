'use client'

import { Badge, Card, CardContent, cn } from '@cgk-platform/ui'
import { CheckCircle, AlertCircle, XCircle, Activity, Globe, Server, Link2 } from 'lucide-react'

import type { DataQualityMetrics, HealthStatus } from '@/lib/attribution'

interface DataQualityWidgetsProps {
  metrics: DataQualityMetrics
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'healthy') {
    return <CheckCircle className="h-4 w-4 text-emerald-500" />
  }
  if (status === 'warning') {
    return <AlertCircle className="h-4 w-4 text-amber-500" />
  }
  return <XCircle className="h-4 w-4 text-red-500" />
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const variants = {
    healthy: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', variants[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Coverage Score Gauge
export function CoverageScoreWidget({ score, trend }: { score: number; trend: DataQualityMetrics['coverageTrend'] }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-500'
    if (s >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Attribution Coverage</h3>
        </div>
        <div className="mt-4 flex items-end gap-4">
          <div className={cn('text-5xl font-bold', getScoreColor(score))}>{score}%</div>
          <div className="mb-1 text-sm text-muted-foreground">
            of orders have attribution data
          </div>
        </div>
        {trend.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Last 30 days trend</p>
            <div className="flex h-12 items-end gap-0.5">
              {trend.slice(0, 30).map((point, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-t',
                    point.score >= 80
                      ? 'bg-emerald-500'
                      : point.score >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  )}
                  style={{ height: `${point.score}%` }}
                  title={`${point.date}: ${point.score}%`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Pixel Health Grid
export function PixelHealthWidget({ pixelHealth }: { pixelHealth: DataQualityMetrics['pixelHealth'] }) {
  const pixels = [
    { name: 'GA4', key: 'ga4' as const, data: pixelHealth.ga4 },
    { name: 'Meta', key: 'meta' as const, data: pixelHealth.meta },
    { name: 'TikTok', key: 'tiktok' as const, data: pixelHealth.tiktok },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Pixel Health</h3>
        </div>
        <div className="mt-4 space-y-3">
          {pixels.map((pixel) => (
            <div key={pixel.key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <StatusIcon status={pixel.data.status} />
                <div>
                  <p className="font-medium">{pixel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pixel.data.lastEvent
                      ? `Last event: ${new Date(pixel.data.lastEvent).toLocaleString()}`
                      : 'No events received'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={pixel.data.status} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {pixel.key === 'meta'
                    ? `EMQ: ${(pixel.data as DataQualityMetrics['pixelHealth']['meta']).emqScore}%`
                    : `${pixel.data.eventCount24h} events/24h`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Visit Coverage Widget
export function VisitCoverageWidget({ coverage }: { coverage: DataQualityMetrics['visitCoverage'] }) {
  const metrics = [
    { label: 'Session ID', value: coverage.sessionId },
    { label: 'Visitor ID', value: coverage.visitorId },
    { label: 'Email Hash', value: coverage.emailHash },
    { label: 'Device Fingerprint', value: coverage.deviceFingerprint },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Visit Coverage</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      metric.value >= 80
                        ? 'bg-emerald-500'
                        : metric.value >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metric.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Server-Side Events Widget
export function ServerSideEventsWidget({ events }: { events: DataQualityMetrics['serverSideEvents'] }) {
  const services = [
    { name: 'GA4 Measurement Protocol', enabled: events.ga4.enabled, metric: events.ga4.successRate, metricLabel: 'Success Rate' },
    { name: 'Meta CAPI', enabled: events.metaCapi.enabled, metric: events.metaCapi.matchQuality, metricLabel: 'Match Quality' },
    { name: 'TikTok Events API', enabled: events.tiktokApi.enabled, metric: events.tiktokApi.successRate, metricLabel: 'Success Rate' },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Server-Side Events</h3>
        </div>
        <div className="mt-4 space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    service.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                  )}
                />
                <span className="text-sm">{service.name}</span>
              </div>
              <div className="text-right">
                <Badge variant={service.enabled ? 'default' : 'secondary'}>
                  {service.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                {service.enabled && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {service.metricLabel}: {service.metric}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Webhook Queue Health Widget
export function WebhookQueueWidget({ queue }: { queue: DataQualityMetrics['webhookQueue'] }) {
  const hasIssues = queue.failed > 0 || queue.pending > 100

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Webhook Queue</h3>
          </div>
          {hasIssues ? (
            <Badge variant="destructive">Issues</Badge>
          ) : (
            <Badge variant="default">Healthy</Badge>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{queue.pending}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className={cn('text-2xl font-bold', queue.failed > 0 && 'text-red-500')}>
              {queue.failed}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processing Rate</p>
            <p className="text-2xl font-bold">{queue.processingRate}/min</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Latency</p>
            <p className="text-2xl font-bold">{queue.avgLatencyMs}ms</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Device Graph Widget
export function DeviceGraphWidget({ graph }: { graph: DataQualityMetrics['deviceGraph'] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Device Graph</h3>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cross-Device Match Rate</span>
              <span className="font-medium">{graph.crossDeviceMatchRate}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${graph.crossDeviceMatchRate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Identity Resolution Rate</span>
              <span className="font-medium">{graph.identityResolutionRate}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${graph.identityResolutionRate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Visitors Linked to Customers</span>
              <span className="font-medium">{graph.visitorsLinked}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${graph.visitorsLinked}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main export that includes all widgets
export function DataQualityDashboard({ metrics }: DataQualityWidgetsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageScoreWidget score={metrics.coverageScore} trend={metrics.coverageTrend} />
        <PixelHealthWidget pixelHealth={metrics.pixelHealth} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <VisitCoverageWidget coverage={metrics.visitCoverage} />
        <ServerSideEventsWidget events={metrics.serverSideEvents} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <WebhookQueueWidget queue={metrics.webhookQueue} />
        <DeviceGraphWidget graph={metrics.deviceGraph} />
      </div>
    </div>
  )
}

export function DataQualitySkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((row) => (
        <div key={row} className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((col) => (
            <Card key={col}>
              <CardContent className="p-6">
                <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
