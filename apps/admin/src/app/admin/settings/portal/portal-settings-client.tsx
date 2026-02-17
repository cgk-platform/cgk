'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'

import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '@cgk-platform/ui'
import {
  Settings,
  Palette,
  MessageSquare,
  Globe,
  Power,
  Save,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import {
  FeatureToggles,
  BrandingEditor,
  MessagingEditor,
} from '@/components/customer-portal'
import type {
  PortalSettings,
  PortalFeatures,
  PortalBranding,
  PortalMessaging,
} from '@/lib/customer-portal/types'

interface PortalSettingsClientProps {
  initialSettings: PortalSettings
}

export function PortalSettingsClient({ initialSettings }: PortalSettingsClientProps) {
  const [settings, setSettings] = useState<PortalSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [customDomain, setCustomDomain] = useState(settings.customDomain || '')
  const [domainSaving, setDomainSaving] = useState(false)

  const updateSettings = useCallback(
    async (
      updates: Partial<{
        features: Partial<PortalFeatures>
        branding: Partial<PortalBranding>
        messaging: Partial<PortalMessaging>
        enabled: boolean
        customDomain: string | null
      }>
    ) => {
      const response = await fetch('/api/admin/customer-portal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    },
    []
  )

  const handleToggleEnabled = (enabled: boolean) => {
    startTransition(async () => {
      await updateSettings({ enabled })
    })
  }

  const handleFeaturesUpdate = async (features: Partial<PortalFeatures>) => {
    await updateSettings({ features })
  }

  const handleBrandingUpdate = async (branding: Partial<PortalBranding>) => {
    await updateSettings({ branding })
  }

  const handleMessagingUpdate = async (messaging: Partial<PortalMessaging>) => {
    await updateSettings({ messaging })
  }

  const handleSaveDomain = async () => {
    setDomainSaving(true)
    try {
      await updateSettings({ customDomain: customDomain.trim() || null })
    } finally {
      setDomainSaving(false)
    }
  }

  const getSSLStatusBadge = () => {
    switch (settings.sslStatus) {
      case 'active':
        return (
          <Badge variant="default" className="gap-1 bg-success">
            <CheckCircle className="h-3 w-3" />
            SSL Active
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            SSL Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            SSL Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            No SSL
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Portal Status Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Power className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Portal Status</h3>
              <p className="text-sm text-muted-foreground">
                {settings.enabled
                  ? 'Your customer portal is live and accessible'
                  : 'Portal is disabled and not accessible to customers'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={settings.enabled ? 'default' : 'secondary'}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messaging</span>
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Domain</span>
          </TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features">
          <FeatureToggles features={settings.features} onUpdate={handleFeaturesUpdate} />
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <BrandingEditor branding={settings.branding} onUpdate={handleBrandingUpdate} />
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging">
          <MessagingEditor messaging={settings.messaging} onUpdate={handleMessagingUpdate} />
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold">Custom Domain</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure a custom domain for your customer portal
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-domain">Domain Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-domain"
                        type="text"
                        placeholder="portal.yourdomain.com"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveDomain}
                        disabled={domainSaving || customDomain === (settings.customDomain || '')}
                      >
                        {domainSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add a CNAME record pointing to your portal subdomain
                    </p>
                  </div>

                  {settings.customDomain && (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{settings.customDomain}</p>
                          <p className="text-xs text-muted-foreground">Current domain</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSSLStatusBadge()}
                        <a
                          href={`https://${settings.customDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* DNS Instructions */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold">DNS Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Add the following DNS record to your domain provider
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium">CNAME</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">portal</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="font-medium">portal.cgk.app</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">DNS propagation may take up to 48 hours</p>
                    <p className="text-xs">
                      SSL certificate will be automatically provisioned once DNS is verified
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Link to Full Domain Settings */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Need more domain options?</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure domains for admin portal, storefront, and more
                    </p>
                  </div>
                  <Link href="/admin/settings/domains">
                    <Button variant="outline" className="gap-2">
                      Domain Settings
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
