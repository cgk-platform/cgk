'use client'

import { Badge, Card, CardContent, Select, SelectOption, Spinner, Switch } from '@cgk/ui'
import { useEffect, useState } from 'react'

import type { NotificationChannel, SenderAddressWithDomain } from '@cgk/communications'

interface RoutingItem {
  notificationType: string
  label: string
  category: string
  isConfigured: boolean
  isEnabled: boolean
  senderEmail: string | null
  channel: NotificationChannel
}

interface GroupedRouting {
  [category: string]: RoutingItem[]
}

interface ListState {
  routing: GroupedRouting
  addresses: SenderAddressWithDomain[]
  loading: boolean
  error: string | null
}

// Channel labels for notification type display
const channelLabels: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  both: 'Both',
}

// Export to avoid unused variable error (used for reference/documentation)
export { channelLabels }

export function RoutingList() {
  const [state, setState] = useState<ListState>({
    routing: {},
    addresses: [],
    loading: true,
    error: null,
  })
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [routingRes, addressesRes] = await Promise.all([
        fetch('/api/admin/settings/email/routing?view=status'),
        fetch('/api/admin/settings/email/addresses'),
      ])

      if (!routingRes.ok) throw new Error('Failed to fetch routing')
      if (!addressesRes.ok) throw new Error('Failed to fetch addresses')

      const routingData = await routingRes.json()
      const addressesData = await addressesRes.json()

      // Filter to only verified addresses
      const verifiedAddresses = addressesData.addresses.filter(
        (a: SenderAddressWithDomain) => a.verificationStatus === 'verified'
      )

      setState({
        routing: routingData.routing,
        addresses: verifiedAddresses,
        loading: false,
        error: null,
      })

      // Auto-expand first category
      const categories = Object.keys(routingData.routing)
      if (categories.length > 0 && !expandedCategory) {
        setExpandedCategory(categories[0] ?? null)
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data',
      }))
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUpdate = async (
    notificationType: string,
    updates: { isEnabled?: boolean; senderAddressId?: string | null }
  ) => {
    setUpdating(notificationType)
    try {
      const res = await fetch(`/api/admin/settings/email/routing/${notificationType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update routing')
      }

      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update routing')
    } finally {
      setUpdating(null)
    }
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (state.error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {state.error}
        </CardContent>
      </Card>
    )
  }

  const categories = Object.keys(state.routing)

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No notification types found.</p>
          <p className="mt-2 text-sm">
            Add sender addresses to start configuring notification routing.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Notification Routing</h3>
          <p className="text-sm text-muted-foreground">
            Configure which sender address to use for each notification type
          </p>
        </div>
        {state.addresses.length === 0 && (
          <Badge className="bg-yellow-100 text-yellow-800">
            Add verified sender addresses first
          </Badge>
        )}
      </div>

      {categories.map((category) => {
        const items = state.routing[category] ?? []
        const isExpanded = expandedCategory === category
        const configuredCount = items.filter((i) => i.isConfigured).length

        return (
          <Card key={category}>
            <button
              className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{category}</span>
                <Badge className="bg-muted text-muted-foreground">
                  {configuredCount}/{items.length} configured
                </Badge>
              </div>
              <span className="text-muted-foreground">
                {isExpanded ? '−' : '+'}
              </span>
            </button>

            {isExpanded && (
              <CardContent className="border-t p-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.notificationType}
                      className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.label}</span>
                          {!item.isEnabled && (
                            <Badge className="bg-muted text-muted-foreground text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {item.senderEmail && (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {item.senderEmail}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Select
                          value={
                            state.addresses.find((a) => a.emailAddress === item.senderEmail)?.id || ''
                          }
                          onChange={(e) =>
                            handleUpdate(item.notificationType, {
                              senderAddressId: e.target.value || null,
                            })
                          }
                          disabled={updating === item.notificationType || state.addresses.length === 0}
                          className="w-48 text-sm"
                        >
                          <SelectOption value="">Use default</SelectOption>
                          {state.addresses.map((addr) => (
                            <SelectOption key={addr.id} value={addr.id}>
                              {addr.emailAddress}
                            </SelectOption>
                          ))}
                        </Select>

                        <Switch
                          checked={item.isEnabled}
                          onCheckedChange={(checked) =>
                            handleUpdate(item.notificationType, { isEnabled: checked })
                          }
                          disabled={updating === item.notificationType}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
