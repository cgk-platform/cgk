'use client'

import { Button, Card, CardContent, cn } from '@cgk/ui'
import {
  ChevronLeft,
  MessageSquare,
  Mail,
  Bell,
  Save,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { SmsNotificationConfig } from '@/lib/integrations/types'

const DEFAULT_NOTIFICATIONS: SmsNotificationConfig[] = [
  {
    id: 'order_confirmation',
    type: 'order_confirmation',
    label: 'Order Confirmation',
    description: 'Sent when a customer places an order',
    channels: { sms: true, email: true, portal: false },
  },
  {
    id: 'shipping_update',
    type: 'shipping_update',
    label: 'Shipping Update',
    description: 'Sent when order ships or tracking updates',
    channels: { sms: true, email: true, portal: false },
  },
  {
    id: 'delivery_confirmation',
    type: 'delivery_confirmation',
    label: 'Delivery Confirmation',
    description: 'Sent when order is delivered',
    channels: { sms: false, email: true, portal: false },
  },
  {
    id: 'subscription_renewal',
    type: 'subscription_renewal',
    label: 'Subscription Renewal',
    description: 'Reminder before subscription renewal',
    channels: { sms: false, email: true, portal: false },
  },
  {
    id: 'creator_application',
    type: 'creator_application',
    label: 'Creator Application',
    description: 'Updates on creator application status',
    channels: { sms: true, email: true, portal: true },
  },
  {
    id: 'creator_payment',
    type: 'creator_payment',
    label: 'Creator Payment',
    description: 'Notification when payment is processed',
    channels: { sms: true, email: true, portal: true },
  },
  {
    id: 'review_request',
    type: 'review_request',
    label: 'Review Request',
    description: 'Request for product review after delivery',
    channels: { sms: false, email: true, portal: false },
  },
  {
    id: 'abandoned_cart',
    type: 'abandoned_cart',
    label: 'Abandoned Cart',
    description: 'Reminder for abandoned shopping carts',
    channels: { sms: false, email: true, portal: false },
  },
]

export default function SmsNotificationsPage() {
  const [notifications, setNotifications] = useState<SmsNotificationConfig[]>(DEFAULT_NOTIFICATIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchNotificationConfig = async () => {
    try {
      const response = await fetch('/api/admin/sms/notifications')
      if (response.ok) {
        const data = await response.json()
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(data.notifications)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification config:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotificationConfig()
  }, [])

  const toggleChannel = (notificationId: string, channel: 'sms' | 'email' | 'portal') => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, channels: { ...n.channels, [channel]: !n.channels[channel] } }
          : n
      )
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/sms/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      })
      if (response.ok) {
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to save:', error)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/integrations/sms">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold">Notification Channels</h2>
            <p className="text-sm text-muted-foreground">
              Configure how notifications are sent
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Channel Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span>SMS</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span>Portal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification List */}
      <Card>
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex-1">
                <p className="font-medium">{notification.label}</p>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* SMS Toggle */}
                <button
                  onClick={() => toggleChannel(notification.id, 'sms')}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                    notification.channels.sms
                      ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                      : 'border-muted text-muted-foreground hover:border-purple-500/50'
                  )}
                  title="SMS"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>

                {/* Email Toggle */}
                <button
                  onClick={() => toggleChannel(notification.id, 'email')}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                    notification.channels.email
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                      : 'border-muted text-muted-foreground hover:border-blue-500/50'
                  )}
                  title="Email"
                >
                  <Mail className="h-4 w-4" />
                </button>

                {/* Portal Toggle */}
                <button
                  onClick={() => toggleChannel(notification.id, 'portal')}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                    notification.channels.portal
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-muted text-muted-foreground hover:border-amber-500/50'
                  )}
                  title="Portal"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> SMS notifications require customer consent. Marketing messages
            will only be sent to customers who have opted in to receive marketing communications.
            Transactional messages (order confirmation, shipping) may be sent without explicit
            marketing consent but should still be expected by the customer.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
