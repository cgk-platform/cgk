'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import {
  ShoppingCart,
  Megaphone,
  MessageSquare,
  Mail,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { IntegrationCard } from '@/components/integrations'
import type { IntegrationCard as IntegrationCardType, IntegrationStatus } from '@/lib/integrations/types'
import { INTEGRATION_CATEGORIES, INTEGRATION_DEFINITIONS } from '@/lib/integrations/types'

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  commerce: ShoppingCart,
  advertising: Megaphone,
  communications: MessageSquare,
  marketing: Mail,
  platform: Cpu,
}

const categoryColors: Record<string, string> = {
  commerce: 'border-l-emerald-500',
  advertising: 'border-l-blue-500',
  communications: 'border-l-purple-500',
  marketing: 'border-l-amber-500',
  platform: 'border-l-rose-500',
}

interface IntegrationStatusData {
  id: string
  status: IntegrationStatus
  statusDetails?: string
  lastSyncedAt?: string
  expiresAt?: string
}

export default function IntegrationsHubPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatusData>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/admin/integrations/status')
      if (response.ok) {
        const data = await response.json()
        setStatuses(data.statuses || {})
      }
    } catch (error) {
      console.error('Failed to fetch integration statuses:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStatuses()
  }

  // Calculate summary stats
  const allIntegrationIds = Object.keys(INTEGRATION_DEFINITIONS)
  const connectedCount = allIntegrationIds.filter(
    (id) => statuses[id]?.status === 'connected'
  ).length
  const errorCount = allIntegrationIds.filter(
    (id) => statuses[id]?.status === 'error'
  ).length
  const pendingCount = allIntegrationIds.filter(
    (id) => statuses[id]?.status === 'pending'
  ).length

  // Build full integration cards with status
  const getIntegrationCard = (id: string): IntegrationCardType => {
    const definition = INTEGRATION_DEFINITIONS[id]
    const statusData = statuses[id]

    return {
      ...definition,
      status: statusData?.status || 'disconnected',
      statusDetails: statusData?.statusDetails,
      lastSyncedAt: statusData?.lastSyncedAt,
      expiresAt: statusData?.expiresAt,
    }
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Cpu className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allIntegrationIds.length}</p>
              <p className="text-xs text-muted-foreground">Total Integrations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{connectedCount}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/10">
              <XCircle className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-500">{errorCount}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {/* Categories */}
      {INTEGRATION_CATEGORIES.map((category) => {
        const Icon = categoryIcons[category.id] || Cpu

        return (
          <div key={category.id} className="space-y-4">
            <div
              className={cn(
                'flex items-center gap-3 border-l-4 pl-4',
                categoryColors[category.id]
              )}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">{category.label}</h2>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {loading
                ? category.integrations.map((id) => (
                    <Card key={id} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="h-10 w-10 rounded-lg bg-muted" />
                          <div className="h-5 w-20 rounded-full bg-muted" />
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="h-5 w-24 rounded bg-muted" />
                          <div className="h-3 w-full rounded bg-muted" />
                        </div>
                        <div className="mt-4 flex justify-between border-t pt-3">
                          <div className="h-3 w-16 rounded bg-muted" />
                          <div className="h-3 w-16 rounded bg-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                : category.integrations.map((id) => (
                    <IntegrationCard key={id} integration={getIntegrationCard(id)} />
                  ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
