'use client'

import {
  Button,
  Card,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cgk/ui'
import { cn } from '@cgk/ui'
import {
  Link2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

import type { PlatformConnection, SecondaryPlatform, SyncFrequency } from '@/lib/attribution'

const PLATFORM_ICONS: Record<SecondaryPlatform, string> = {
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn',
  mntn: 'MNTN',
  affiliate: 'Affiliate',
}

const PLATFORM_DESCRIPTIONS: Record<SecondaryPlatform, string> = {
  snapchat: 'Connect Snapchat Ads for attribution data',
  pinterest: 'Connect Pinterest Ads for attribution data',
  linkedin: 'Connect LinkedIn Ads for B2B attribution',
  mntn: 'Connect MNTN for CTV attribution',
  affiliate: 'Connect affiliate networks for partner attribution',
}

export default function PlatformsPage() {
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/attribution/platforms/connections')
      const data = await response.json()
      setConnections(data.connections)
    } catch (err) {
      setError('Failed to load platform connections')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleConnect = async (platform: SecondaryPlatform) => {
    setConnectingPlatform(platform)
    try {
      const response = await fetch(`/api/admin/attribution/platforms/${platform}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to connect platform')
      }

      await fetchConnections()
    } catch (err) {
      setError(`Failed to connect ${platform}`)
      console.error(err)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleDisconnect = async (platform: SecondaryPlatform) => {
    setConnectingPlatform(platform)
    try {
      const response = await fetch(`/api/admin/attribution/platforms/${platform}/connect`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect platform')
      }

      await fetchConnections()
    } catch (err) {
      setError(`Failed to disconnect ${platform}`)
      console.error(err)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleSync = async (platform: SecondaryPlatform) => {
    setSyncingPlatform(platform)
    try {
      const response = await fetch(`/api/admin/attribution/platforms/${platform}/sync`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to sync platform')
      }

      await fetchConnections()
    } catch (err) {
      setError(`Failed to sync ${platform}`)
      console.error(err)
    } finally {
      setSyncingPlatform(null)
    }
  }

  const handleUpdateFrequency = async (platform: SecondaryPlatform, frequency: SyncFrequency) => {
    try {
      const response = await fetch(`/api/admin/attribution/platforms/${platform}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncFrequency: frequency }),
      })

      if (!response.ok) {
        throw new Error('Failed to update frequency')
      }

      await fetchConnections()
    } catch (err) {
      setError(`Failed to update sync frequency`)
      console.error(err)
    }
  }

  const handleToggleEnabled = async (platform: SecondaryPlatform, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/attribution/platforms/${platform}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle sync')
      }

      await fetchConnections()
    } catch (err) {
      setError(`Failed to update sync settings`)
      console.error(err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (connection: PlatformConnection) => {
    switch (connection.status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800">
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            Error
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            Not Connected
          </Badge>
        )
    }
  }

  const getSyncStatusBadge = (status: string | null) => {
    if (!status) return null

    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Connections</h2>
          <p className="text-sm text-muted-foreground">
            Connect secondary ad platforms for comprehensive attribution
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.platform}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    connection.status === 'connected'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  )}>
                    <Link2 className={cn(
                      'h-5 w-5',
                      connection.status === 'connected'
                        ? 'text-green-600'
                        : 'text-gray-500'
                    )} />
                  </div>
                  <div>
                    <h3 className="font-medium">{connection.displayName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {PLATFORM_DESCRIPTIONS[connection.platform]}
                    </p>
                  </div>
                </div>
                {getStatusIcon(connection.status)}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(connection)}
                </div>

                {connection.status === 'connected' && (
                  <>
                    {connection.accountName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Account</span>
                        <span className="text-sm">{connection.accountName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sync Frequency</span>
                      <Select
                        value={connection.syncFrequency}
                        onValueChange={(value) =>
                          handleUpdateFrequency(connection.platform, value as SyncFrequency)
                        }
                      >
                        <SelectTrigger className="h-7 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {connection.lastSyncAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {new Date(connection.lastSyncAt).toLocaleString()}
                          </span>
                          {getSyncStatusBadge(connection.lastSyncStatus)}
                        </div>
                      </div>
                    )}

                    {connection.recordsSynced !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Records Synced</span>
                        <span className="text-sm">
                          {connection.recordsSynced.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {connection.errorMessage && (
                      <div className="mt-2 rounded-md bg-red-50 p-2">
                        <p className="text-xs text-red-600">{connection.errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {connection.status === 'connected' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.platform)}
                      disabled={syncingPlatform === connection.platform}
                      className="flex-1"
                    >
                      {syncingPlatform === connection.platform ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connection.platform)}
                      disabled={connectingPlatform === connection.platform}
                    >
                      {connectingPlatform === connection.platform ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(connection.platform)}
                    disabled={connectingPlatform === connection.platform}
                    className="w-full"
                  >
                    {connectingPlatform === connection.platform ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
