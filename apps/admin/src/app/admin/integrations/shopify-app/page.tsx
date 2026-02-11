'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk/ui'
import {
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Shield,
  Code,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConnectionStatusBadge, OAuthConnectButton, TestConnectionResult } from '@/components/integrations'

interface ShopifyStatus {
  connected: boolean
  shopDomain?: string
  scopes: string[]
  pixelEnabled: boolean
  storefrontConfigured: boolean
  lastSyncedAt?: string
}

const SHOPIFY_SCOPE_CATEGORIES = [
  {
    category: 'Pixels',
    scopes: ['write_pixels', 'read_customer_events'],
  },
  {
    category: 'Orders',
    scopes: ['read_orders', 'write_orders', 'read_all_orders'],
  },
  {
    category: 'Customers',
    scopes: ['read_customers', 'write_customers'],
  },
  {
    category: 'Products',
    scopes: ['read_products', 'write_products'],
  },
  {
    category: 'Discounts',
    scopes: ['read_discounts', 'write_discounts'],
  },
  {
    category: 'Inventory',
    scopes: ['read_inventory', 'write_inventory'],
  },
]

export default function ShopifyAppPage() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/shopify-app/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch Shopify status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/admin/shopify-app/auth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Shopify? This will disable order sync and tracking.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/shopify-app/disconnect', {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus({ connected: false, scopes: [], pixelEnabled: false, storefrontConfigured: false })
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      const response = await fetch('/api/admin/shopify-app/test', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setTestStatus('success')
        setTestMessage(`Shop "${data.shopName}" is accessible`)
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Connection test failed')
      }
    } catch {
      setTestStatus('error')
      setTestMessage('Failed to test connection')
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

  const hasScope = (scope: string) => status?.scopes.includes(scope)

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                status?.connected ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
              )}>
                <ShoppingBag className={cn(
                  'h-7 w-7',
                  status?.connected ? 'text-emerald-500' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Shopify App</h2>
                  <ConnectionStatusBadge
                    status={status?.connected ? 'connected' : 'disconnected'}
                  />
                </div>
                {status?.shopDomain && (
                  <a
                    href={`https://${status.shopDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {status.shopDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {status?.lastSyncedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.connected && (
                <Button variant="outline" size="sm" onClick={handleTestConnection}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
              )}
              <OAuthConnectButton
                provider="shopify"
                connected={status?.connected}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>

          {testStatus !== 'idle' && (
            <div className="mt-4">
              <TestConnectionResult status={testStatus} message={testMessage} />
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <>
          {/* OAuth Scopes */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">OAuth Scopes</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Permissions granted to the CGK app on your Shopify store.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SHOPIFY_SCOPE_CATEGORIES.map((cat) => (
                  <div key={cat.category} className="rounded-lg border p-3">
                    <h4 className="font-medium text-sm mb-2">{cat.category}</h4>
                    <div className="space-y-1">
                      {cat.scopes.map((scope) => (
                        <div
                          key={scope}
                          className="flex items-center gap-2 text-xs"
                        >
                          {hasScope(scope) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          <code className={cn(
                            'font-mono',
                            hasScope(scope) ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {scope}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {status.scopes.length < 10 && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Limited Permissions</p>
                    <p className="text-muted-foreground">
                      Some features may not work. Click "Connect with Shopify" to re-authorize with full permissions.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Web Pixel Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Web Pixel</h3>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Pixel Status</p>
                  <p className="text-sm text-muted-foreground">
                    Tracks customer events for GA4 and Meta CAPI
                  </p>
                </div>
                <Badge variant={status.pixelEnabled ? 'success' : 'secondary'}>
                  {status.pixelEnabled ? 'Active' : 'Not Installed'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Storefront API */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Storefront API</h3>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Storefront Configuration</p>
                  <p className="text-sm text-muted-foreground">
                    Enables headless commerce features
                  </p>
                </div>
                <Badge variant={status.storefrontConfigured ? 'success' : 'secondary'}>
                  {status.storefrontConfigured ? 'Configured' : 'Not Configured'}
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
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </span>
                <span>Click "Connect with Shopify" to authorize the CGK app</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                <span>Review and approve the requested permissions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                <span>You'll be redirected back to configure additional settings</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
