'use client'

import { Button, Card, CardContent, Badge, Input, Label, cn } from '@cgk-platform/ui'
import {
  Globe,
  Code,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, OAuthConnectButton, SecureApiKeyInput } from '@/components/integrations'
import type { TikTokAdsStatus } from '@/lib/integrations/types'

export default function TikTokAdsPage() {
  const [status, setStatus] = useState<TikTokAdsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pixelId, setPixelId] = useState('')
  const [eventsApiToken, setEventsApiToken] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/tiktok-ads/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.pixelId) setPixelId(data.pixelId)
      }
    } catch (error) {
      console.error('Failed to fetch TikTok Ads status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/tiktok-ads/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect TikTok Ads?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/tiktok-ads/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({
          connected: false,
          eventsApiConfigured: false,
        })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleSavePixelConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/tiktok-ads/pixel-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixelId, eventsApiToken }),
      })
      if (response.ok) {
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to save pixel config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 w-48 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const tokenExpiring = status?.tokenExpiresAt &&
    new Date(status.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                status?.connected ? 'bg-zinc-800' : 'bg-zinc-500/10'
              )}>
                <Globe className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-white' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">TikTok Ads</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  TikTok advertising with Events API
                </p>
                {status?.advertiserId && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Advertiser ID: {status.advertiserId}
                  </p>
                )}
                {status?.lastSyncedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <OAuthConnectButton
                provider="tiktok"
                connected={status?.connected}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>

          {tokenExpiring && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">Token Expiring Soon</p>
                <p className="text-muted-foreground">
                  Your TikTok access token expires on {new Date(status.tokenExpiresAt!).toLocaleDateString()}.
                  Re-connect to refresh your token.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pixel Configuration - Available regardless of OAuth status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Pixel Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure TikTok Pixel for event tracking. You can set this up even without
            OAuth if you have the pixel credentials.
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pixel-id">Pixel ID</Label>
              <Input
                id="pixel-id"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Enter your TikTok Pixel ID"
                className="mt-1.5 font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Found in TikTok Events Manager under Assets {">"} Events
              </p>
            </div>

            <SecureApiKeyInput
              value={eventsApiToken}
              onChange={setEventsApiToken}
              label="Events API Access Token (Optional)"
              description="For server-side event tracking. Generate in Events Manager."
              placeholder="Enter access token..."
            />

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Events API Status</p>
                <p className="text-sm text-muted-foreground">
                  Server-side event tracking
                </p>
              </div>
              <Badge variant={status?.eventsApiConfigured ? 'success' : 'secondary'}>
                {status?.eventsApiConfigured ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>

            <Button onClick={handleSavePixelConfig} disabled={saving || !pixelId}>
              {saving ? 'Saving...' : 'Save Pixel Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {status?.connected && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Data Sync</h3>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Spend Data</p>
                  <p className="text-sm text-muted-foreground">
                    Ad spend synced for attribution
                  </p>
                </div>
                <Badge variant="secondary">
                  {status.lastSyncedAt ? 'Active' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {!status?.connected && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Setup Instructions</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-white">
                  1
                </span>
                <span>Click "Connect with TikTok" to authorize access to your TikTok For Business account</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-white">
                  2
                </span>
                <span>Select the advertiser account you want to connect</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-white">
                  3
                </span>
                <span>Configure your Pixel ID for event tracking (optional: add Events API token for server-side tracking)</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
