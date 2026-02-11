'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@cgk/ui'
import { Card, CardContent, CardHeader } from '@cgk/ui'
import { Switch } from '@cgk/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@cgk/ui'

import type { SenderAddressWithDomain } from '@cgk/communications'
import type { NotificationRoutingStepProps } from '../types'

interface RoutingItem {
  notificationType: string
  label: string
  category: string
  isEnabled: boolean
  senderAddressId: string | null
  senderEmail: string | null
}

/**
 * Step 5e: Notification Routing
 *
 * Configure which sender address to use for each notification type.
 */
export function NotificationRoutingStep({
  senderAddresses,
  onComplete,
  onBack,
}: NotificationRoutingStepProps) {
  const [routing, setRouting] = useState<RoutingItem[]>([])
  const [groupedRouting, setGroupedRouting] = useState<Record<string, RoutingItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Local state for changes
  const [localChanges, setLocalChanges] = useState<
    Record<string, { senderAddressId: string | null; isEnabled: boolean }>
  >({})

  // Load routing configuration
  useEffect(() => {
    async function load() {
      try {
        // Initialize routing first
        await fetch('/api/admin/onboarding/email/routing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialize: true }),
        })

        const response = await fetch('/api/admin/onboarding/email/routing?includeTypes=true')
        const data = await response.json()

        if (data.routing) {
          setRouting(data.routing)

          // Group by category
          const grouped: Record<string, RoutingItem[]> = {}
          data.routing.forEach((item: RoutingItem) => {
            if (!grouped[item.category]) {
              grouped[item.category] = []
            }
            grouped[item.category].push(item)
          })
          setGroupedRouting(grouped)
        }
      } catch {
        // Continue with empty
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleAutoAssign = useCallback(async () => {
    setIsAutoAssigning(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/onboarding/email/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAssign: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to auto-assign')
      }

      // Reload routing
      const reloadResponse = await fetch('/api/admin/onboarding/email/routing?includeTypes=true')
      const reloadData = await reloadResponse.json()
      if (reloadData.routing) {
        setRouting(reloadData.routing)
        const grouped: Record<string, RoutingItem[]> = {}
        reloadData.routing.forEach((item: RoutingItem) => {
          if (!grouped[item.category]) {
            grouped[item.category] = []
          }
          grouped[item.category].push(item)
        })
        setGroupedRouting(grouped)
      }

      setSuccessMessage(`Auto-assigned ${data.assigned} notification types`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-assign')
    } finally {
      setIsAutoAssigning(false)
    }
  }, [])

  const handleChange = useCallback(
    (type: string, field: 'senderAddressId' | 'isEnabled', value: string | boolean) => {
      setLocalChanges((prev) => {
        const current = prev[type] || {
          senderAddressId: routing.find((r) => r.notificationType === type)?.senderAddressId ?? null,
          isEnabled: routing.find((r) => r.notificationType === type)?.isEnabled ?? true,
        }
        return {
          ...prev,
          [type]: {
            ...current,
            [field]: value,
          },
        }
      })
    },
    [routing]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Build routing config from changes
      const routingConfig = Object.entries(localChanges).map(([notificationType, config]) => ({
        notificationType,
        senderAddressId: config.senderAddressId,
        isEnabled: config.isEnabled,
      }))

      if (routingConfig.length > 0) {
        const response = await fetch('/api/admin/onboarding/email/routing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routing: routingConfig }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save routing')
        }
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [localChanges, onComplete])

  if (isLoading) {
    return <div className="text-center py-8">Loading notification routing...</div>
  }

  const categories = Object.keys(groupedRouting)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Configure Notification Routing</h4>
          <p className="text-sm text-muted-foreground">
            Choose which sender address to use for each notification type.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleAutoAssign}
          disabled={isAutoAssigning}
        >
          {isAutoAssigning ? 'Assigning...' : 'Apply Defaults'}
        </Button>
      </div>

      {/* Grouped notifications */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader className="py-4">
            <h5 className="font-medium">{category}</h5>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedRouting[category]?.map((item) => {
              const current = localChanges[item.notificationType] || {
                senderAddressId: item.senderAddressId,
                isEnabled: item.isEnabled,
              }

              return (
                <div
                  key={item.notificationType}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>

                  <Select
                    value={current.senderAddressId || 'none'}
                    onValueChange={(value) =>
                      handleChange(
                        item.notificationType,
                        'senderAddressId',
                        value === 'none' ? null : value
                      )
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select sender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Use default</SelectItem>
                      {senderAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.emailAddress}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Switch
                    checked={current.isEnabled}
                    onCheckedChange={(checked) =>
                      handleChange(item.notificationType, 'isEnabled', checked)
                    }
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Completing...' : 'Complete Email Setup'}
        </Button>
      </div>
    </div>
  )
}

export default NotificationRoutingStep
