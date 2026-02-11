'use client'

import { Button, Card, CardContent, Badge, Input, Label, cn } from '@cgk/ui'
import {
  Facebook,
  RefreshCw,
  Building2,
  Code,
  BarChart3,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, OAuthConnectButton } from '@/components/integrations'
import type { MetaAdsStatus } from '@/lib/integrations/types'

export default function MetaAdsPage() {
  const [status, setStatus] = useState<MetaAdsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [pixelId, setPixelId] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/meta-ads/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.selectedAccountId) {
          setSelectedAccount(data.selectedAccountId)
        }
        if (data.pixelId) {
          setPixelId(data.pixelId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch Meta Ads status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/meta-ads/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Meta Ads?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/meta-ads/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({
          connected: false,
          accounts: [],
          capiConfigured: false,
          syncStatus: 'idle',
        })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/meta-ads/sync', {
        method: 'POST',
      })
      if (response.ok) {
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to sync:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/meta-ads/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedAccountId: selectedAccount,
          pixelId,
        }),
      })
      if (response.ok) {
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to save config:', error)
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
                status?.connected ? 'bg-blue-500/10' : 'bg-zinc-500/10'
              )}>
                <Facebook className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-blue-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Meta Ads</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Facebook & Instagram advertising with Conversions API
                </p>
                {status?.lastSyncedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.connected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
                  Sync Data
                </Button>
              )}
              <OAuthConnectButton
                provider="meta"
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
                  Your Meta access token expires on {new Date(status.tokenExpiresAt!).toLocaleDateString()}.
                  Re-connect to refresh your token.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <>
          {/* Ad Account Selection */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Ad Account</h3>
              </div>

              {status.accounts.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ad-account">Select Ad Account</Label>
                    <select
                      id="ad-account"
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select an account...</option>
                      {status.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.id}) - {account.currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button onClick={handleSaveConfig} disabled={saving || !selectedAccount}>
                    {saving ? 'Saving...' : 'Save Selection'}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No ad accounts found. Make sure your Meta account has access to ad accounts.
                </div>
              )}
            </CardContent>
          </Card>

          {/* CAPI Configuration */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Conversions API (CAPI)</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="pixel-id">Pixel ID</Label>
                  <Input
                    id="pixel-id"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    placeholder="Enter your Meta Pixel ID"
                    className="mt-1.5 font-mono"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Found in Meta Events Manager under Data Sources
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">CAPI Status</p>
                    <p className="text-sm text-muted-foreground">
                      Server-side event tracking
                    </p>
                  </div>
                  <Badge variant={status.capiConfigured ? 'success' : 'secondary'}>
                    {status.capiConfigured ? 'Configured' : 'Not Configured'}
                  </Badge>
                </div>

                <Button onClick={handleSaveConfig} disabled={saving || !pixelId}>
                  {saving ? 'Saving...' : 'Save Pixel Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Data Sync</h3>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Spend Data</p>
                    <p className="text-sm text-muted-foreground">
                      Ad spend synced for attribution
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    status.syncStatus === 'syncing'
                      ? 'info'
                      : status.syncStatus === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {status.syncStatus === 'syncing' ? 'Syncing...' :
                   status.syncStatus === 'error' ? 'Error' : 'Idle'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Setup Instructions */}
      {!status?.connected && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Setup Instructions</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  1
                </span>
                <span>Click "Connect with Meta" to authorize access to your ad accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  2
                </span>
                <span>Select which ad accounts and pages you want to connect</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  3
                </span>
                <span>Configure your Pixel ID for Conversions API tracking</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
