'use client'

import { Card, CardContent, Switch, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@cgk/ui'
import { Settings, Users, Palette, MessageSquare, BarChart3, Power } from 'lucide-react'
import { useState, useTransition, useCallback } from 'react'

import {
  FeatureToggles,
  CustomerLookup,
  BrandingEditor,
  MessagingEditor,
  PortalAnalytics,
} from '@/components/customer-portal'
import type {
  PortalSettings,
  PortalFeatures,
  PortalBranding,
  PortalMessaging,
  PortalAnalyticsSummary,
  PortalCustomer,
  CommunicationPreference,
} from '@/lib/customer-portal/types'

import { CustomerDetailPanel } from './customer-detail-panel'

interface CustomerPortalPageClientProps {
  initialSettings: PortalSettings
  initialAnalytics: PortalAnalyticsSummary
  initialDateRange: { start: Date; end: Date }
}

export function CustomerPortalPageClient({
  initialSettings,
  initialAnalytics,
  initialDateRange,
}: CustomerPortalPageClientProps) {
  const [settings, setSettings] = useState<PortalSettings>(initialSettings)
  const [analytics, setAnalytics] = useState<PortalAnalyticsSummary>(initialAnalytics)
  const [dateRange, setDateRange] = useState(initialDateRange)
  const [isPending, startTransition] = useTransition()

  // Customer detail panel state
  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: PortalCustomer
    preferences: CommunicationPreference | null
  } | null>(null)

  const updateSettings = useCallback(
    async (
      updates: Partial<{
        features: Partial<PortalFeatures>
        branding: Partial<PortalBranding>
        messaging: Partial<PortalMessaging>
        enabled: boolean
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

  const handleCustomerSearch = async (query: string): Promise<PortalCustomer[]> => {
    const response = await fetch(
      `/api/admin/customer-portal/customers?q=${encodeURIComponent(query)}`
    )
    if (response.ok) {
      const data = await response.json()
      return data.customers
    }
    return []
  }

  const handleViewCustomer = async (customer: PortalCustomer) => {
    const response = await fetch(`/api/admin/customer-portal/customers/${customer.id}`)
    if (response.ok) {
      const data = await response.json()
      setSelectedCustomer({
        customer: data.customer,
        preferences: data.preferences,
      })
    }
  }

  const handleImpersonate = async (customer: PortalCustomer, reason: string) => {
    const response = await fetch(`/api/admin/customer-portal/customers/${customer.id}/impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })

    if (response.ok) {
      const data = await response.json()
      // In production, this would redirect to the customer portal with the impersonation token
      // For now, we show an alert with the session info
      alert(
        `Impersonation session started.\nSession ID: ${data.sessionId}\n\nIn production, this would open the customer portal as ${customer.email || customer.firstName}.`
      )
    } else {
      const error = await response.json()
      alert(`Failed to start impersonation: ${error.error}`)
    }
  }

  const handleDateRangeChange = async (range: { start: Date; end: Date }) => {
    setDateRange(range)

    const response = await fetch(
      `/api/admin/customer-portal/analytics?start=${range.start.toISOString()}&end=${range.end.toISOString()}`
    )

    if (response.ok) {
      const data = await response.json()
      setAnalytics(data.summary)
    }
  }

  const handleUpdateCustomerPrefs = async (
    prefs: Partial<Omit<CommunicationPreference, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!selectedCustomer) return

    const response = await fetch(
      `/api/admin/customer-portal/customers/${selectedCustomer.customer.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationPreferences: prefs }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      setSelectedCustomer({
        customer: data.customer,
        preferences: data.preferences,
      })
    }
  }

  return (
    <>
      {/* Portal Enable/Disable Toggle */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Power className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Customer Portal</h3>
              <p className="text-sm text-muted-foreground">
                {settings.enabled
                  ? 'Portal is live and accessible to customers'
                  : 'Portal is disabled and not accessible'}
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

      {/* Main Tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messaging</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab - Feature Toggles */}
        <TabsContent value="settings">
          <FeatureToggles features={settings.features} onUpdate={handleFeaturesUpdate} />
        </TabsContent>

        {/* Customers Tab - Lookup & Impersonation */}
        <TabsContent value="customers">
          <CustomerLookup
            onSearch={handleCustomerSearch}
            onViewCustomer={handleViewCustomer}
            onImpersonate={handleImpersonate}
          />
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <BrandingEditor branding={settings.branding} onUpdate={handleBrandingUpdate} />
        </TabsContent>

        {/* Messaging Tab */}
        <TabsContent value="messaging">
          <MessagingEditor messaging={settings.messaging} onUpdate={handleMessagingUpdate} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <PortalAnalytics
            summary={analytics}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </TabsContent>
      </Tabs>

      {/* Customer Detail Side Panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer.customer}
          preferences={selectedCustomer.preferences}
          onClose={() => setSelectedCustomer(null)}
          onUpdatePrefs={handleUpdateCustomerPrefs}
        />
      )}
    </>
  )
}
