'use client'

import { Button, Card, CardContent, cn } from '@cgk-platform/ui'
import {
  Star,
  Database,
  Server,
  Package,
  CheckCircle2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  ConnectionStatusBadge,
  SecureApiKeyInput,
  TestConnectionResult,
} from '@/components/integrations'
import type { YotpoStatus } from '@/lib/integrations/types'

export default function YotpoPage() {
  const [status, setStatus] = useState<YotpoStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [appKey, setAppKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/yotpo/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch Yotpo status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleTestConnection = async () => {
    if (!appKey || !apiSecret) return
    setTestStatus('testing')

    try {
      const response = await fetch('/api/admin/yotpo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, apiSecret }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage('Connection successful')
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection test failed')
      }
    } catch {
      setTestStatus('error')
      setTestMessage('Failed to test connection')
    }
  }

  const handleConnect = async () => {
    if (!appKey || !apiSecret) return
    setSaving(true)

    try {
      const response = await fetch('/api/admin/yotpo/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey, apiSecret }),
      })

      if (response.ok) {
        setAppKey('')
        setApiSecret('')
        await fetchStatus()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Yotpo?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/yotpo/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({
          connected: false,
          authSource: 'database',
        })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
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

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                status?.connected ? 'bg-amber-500/10' : 'bg-zinc-500/10'
              )}>
                <Star className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-amber-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Yotpo</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Product reviews and ratings
                </p>
                {status?.appKey && (
                  <p className="mt-1 text-xs text-muted-foreground font-mono">
                    App Key: {status.appKey}
                  </p>
                )}
              </div>
            </div>

            {status?.connected && (
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>

          {status?.connected && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              {status.authSource === 'env' ? (
                <>
                  <Server className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Using environment variables</span>
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Using stored credentials</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected && status.productMappings && (
        /* Product Mappings */
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Product Mappings</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Shopify product IDs mapped for review fetching
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(status.productMappings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium capitalize">{key}</span>
                  {value ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <code className="font-mono text-sm text-muted-foreground">{value}</code>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not mapped</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!status?.connected && (
        <>
          {/* Connection Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Connect Yotpo</h3>

              <div className="space-y-4">
                <SecureApiKeyInput
                  value={appKey}
                  onChange={setAppKey}
                  label="App Key"
                  description="Found in Yotpo Dashboard > Settings > General"
                  placeholder="Enter app key..."
                />

                <SecureApiKeyInput
                  value={apiSecret}
                  onChange={setApiSecret}
                  label="API Secret"
                  description="Found in Yotpo Dashboard > Settings > General"
                  placeholder="Enter API secret..."
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={!appKey || !apiSecret || testStatus === 'testing'}
                  >
                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={!appKey || !apiSecret || saving}
                  >
                    {saving ? 'Connecting...' : 'Save & Connect'}
                  </Button>
                </div>

                {testStatus !== 'idle' && (
                  <TestConnectionResult status={testStatus} message={testMessage} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Getting Your API Credentials</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    1
                  </span>
                  <span>Log in to your Yotpo account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    2
                  </span>
                  <span>Go to Settings {">"} General</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    3
                  </span>
                  <span>Find your App Key and API Secret in the API Keys section</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    4
                  </span>
                  <span>Copy both values and paste them above</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
