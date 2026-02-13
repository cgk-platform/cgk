'use client'

import { Button, Card, CardContent, Badge, cn } from '@cgk-platform/ui'
import {
  Truck,
  BarChart3,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Code,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Extension status from the API
 */
interface ExtensionStatus {
  handle: string
  name: string
  type: 'function' | 'web_pixel_extension' | 'checkout_ui_extension'
  status: 'active' | 'inactive' | 'error' | 'pending'
  lastDeployed?: string
  version?: string
  errorMessage?: string
  configured: boolean
}

/**
 * Extension configuration status
 */
interface ExtensionsData {
  connected: boolean
  shopDomain?: string
  extensions: ExtensionStatus[]
}

/**
 * Extension card configuration
 */
interface ExtensionConfig {
  handle: string
  name: string
  description: string
  icon: React.ReactNode
  type: 'function' | 'web_pixel_extension' | 'checkout_ui_extension'
  configurable: boolean
  docsUrl?: string
}

const EXTENSION_CONFIGS: ExtensionConfig[] = [
  {
    handle: 'delivery-customization',
    name: 'Delivery Customization',
    description: 'Hides or shows shipping rates based on A/B test variant assignment for shipping price testing.',
    icon: <Truck className="h-5 w-5" />,
    type: 'function',
    configurable: false,
    docsUrl: '/docs/extensions/delivery-customization',
  },
  {
    handle: 'session-stitching-pixel',
    name: 'Session Stitching Pixel',
    description: 'Captures session identifiers and sends events to GA4 Measurement Protocol and Meta CAPI.',
    icon: <BarChart3 className="h-5 w-5" />,
    type: 'web_pixel_extension',
    configurable: true,
    docsUrl: '/docs/extensions/session-stitching',
  },
  {
    handle: 'post-purchase-survey',
    name: 'Post-Purchase Survey',
    description: 'Renders a configurable survey on the order confirmation page for attribution and feedback.',
    icon: <MessageSquare className="h-5 w-5" />,
    type: 'checkout_ui_extension',
    configurable: true,
    docsUrl: '/docs/extensions/post-purchase-survey',
  },
]

/**
 * Shopify Extensions Management Page
 */
export default function ShopifyExtensionsPage() {
  const [data, setData] = useState<ExtensionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchExtensions = async () => {
    try {
      const response = await fetch('/api/admin/shopify-app/extensions')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch extensions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExtensions()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchExtensions()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ExtensionPageHeader />
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-32 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data?.connected) {
    return (
      <div className="space-y-6">
        <ExtensionPageHeader />
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold">Shopify Not Connected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your Shopify store first to manage extensions.
            </p>
            <Link href="/admin/integrations/shopify-app">
              <Button className="mt-4">
                Connect Shopify
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ExtensionPageHeader
        shopDomain={data.shopDomain}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="grid gap-4">
        {EXTENSION_CONFIGS.map((config) => {
          const status = data.extensions.find(e => e.handle === config.handle)
          return (
            <ExtensionCard
              key={config.handle}
              config={config}
              status={status}
            />
          )
        })}
      </div>

      {/* Deployment Instructions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Deployment</h3>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
            <p className="text-muted-foreground"># Deploy all extensions</p>
            <p className="mt-1">cd apps/shopify-app && shopify app deploy</p>
            <p className="mt-3 text-muted-foreground"># Test a specific function locally</p>
            <p className="mt-1">shopify app function run --path extensions/delivery-customization</p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Extensions are deployed via the Shopify CLI. After deployment, they become available
            in your Shopify admin under Settings &gt; Apps and sales channels.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Page header component
 */
interface ExtensionPageHeaderProps {
  shopDomain?: string
  onRefresh?: () => void
  refreshing?: boolean
}

function ExtensionPageHeader({ shopDomain, onRefresh, refreshing }: ExtensionPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Shopify Extensions</h2>
        <p className="text-sm text-muted-foreground">
          Manage Shopify Functions and UI extensions for checkout customization
        </p>
        {shopDomain && (
          <a
            href={`https://${shopDomain}/admin/settings/apps`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View in Shopify Admin
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      )}
    </div>
  )
}

/**
 * Individual extension card
 */
interface ExtensionCardProps {
  config: ExtensionConfig
  status?: ExtensionStatus
}

function ExtensionCard({ config, status }: ExtensionCardProps) {
  const getStatusBadge = () => {
    if (!status) {
      return <Badge variant="secondary">Not Deployed</Badge>
    }

    switch (status.status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getTypeLabel = () => {
    switch (config.type) {
      case 'function':
        return 'Shopify Function (Rust/WASM)'
      case 'web_pixel_extension':
        return 'Web Pixel Extension'
      case 'checkout_ui_extension':
        return 'Checkout UI Extension'
      default:
        return 'Extension'
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              status?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
            )}>
              {config.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{config.name}</h3>
                {getStatusBadge()}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {config.description}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  {getTypeLabel()}
                </span>

                {status?.lastDeployed && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Deployed: {new Date(status.lastDeployed).toLocaleDateString()}
                  </span>
                )}

                {status?.version && (
                  <span>v{status.version}</span>
                )}
              </div>

              {status?.errorMessage && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500">{status.errorMessage}</p>
                </div>
              )}

              {!status?.configured && config.configurable && status?.status === 'active' && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    This extension requires configuration in the Shopify admin.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.configurable && status?.status === 'active' && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://${status?.handle || config.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Configuration checklist for active extensions */}
        {status?.status === 'active' && config.configurable && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Configuration Status</h4>
            <div className="space-y-1">
              {config.handle === 'session-stitching-pixel' && (
                <>
                  <ConfigItem label="GA4 Measurement ID" configured={status.configured} />
                  <ConfigItem label="GA4 API Secret" configured={status.configured} />
                  <ConfigItem label="Meta Pixel ID (optional)" configured={true} />
                  <ConfigItem label="Meta Access Token (optional)" configured={true} />
                </>
              )}
              {config.handle === 'post-purchase-survey' && (
                <>
                  <ConfigItem label="Survey Configuration URL" configured={status.configured} />
                  <ConfigItem label="API Key" configured={status.configured} />
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Configuration item component
 */
interface ConfigItemProps {
  label: string
  configured: boolean
}

function ConfigItem({ label, configured }: ConfigItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {configured ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-zinc-400" />
      )}
      <span className={cn(configured ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  )
}
