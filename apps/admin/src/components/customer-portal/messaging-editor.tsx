'use client'

import { Button, Card, CardContent, Input, Label, cn } from '@cgk/ui'
import { CornerUpLeft, Save, MessageSquare, Info } from 'lucide-react'
import { useState, useTransition } from 'react'

import type { PortalMessaging } from '@/lib/customer-portal/types'
import { DEFAULT_PORTAL_MESSAGING } from '@/lib/customer-portal/types'

interface MessagingEditorProps {
  messaging: PortalMessaging
  onUpdate: (messaging: Partial<PortalMessaging>) => Promise<void>
}

interface MessagingField {
  key: keyof PortalMessaging
  label: string
  description: string
  multiline?: boolean
  variables?: string[]
}

const MESSAGING_FIELDS: MessagingField[] = [
  {
    key: 'welcomeMessage',
    label: 'Welcome Message',
    description: 'Greeting shown on the dashboard',
    variables: ['firstName', 'lastName', 'email'],
  },
  {
    key: 'dashboardTitle',
    label: 'Dashboard Title',
    description: 'Title of the main dashboard page',
  },
  {
    key: 'ordersTitle',
    label: 'Orders Title',
    description: 'Title of the orders page',
  },
  {
    key: 'ordersDescription',
    label: 'Orders Description',
    description: 'Subtitle shown on orders page',
  },
  {
    key: 'ordersEmptyMessage',
    label: 'Orders Empty State',
    description: 'Message when customer has no orders',
    multiline: true,
  },
  {
    key: 'subscriptionsTitle',
    label: 'Subscriptions Title',
    description: 'Title of the subscriptions page',
  },
  {
    key: 'subscriptionsDescription',
    label: 'Subscriptions Description',
    description: 'Subtitle shown on subscriptions page',
  },
  {
    key: 'subscriptionsEmptyMessage',
    label: 'Subscriptions Empty State',
    description: 'Message when customer has no subscriptions',
    multiline: true,
  },
  {
    key: 'signOutText',
    label: 'Sign Out Button',
    description: 'Text for the sign out button',
  },
  {
    key: 'footerText',
    label: 'Footer Text',
    description: 'Text shown in the portal footer',
    multiline: true,
  },
]

export function MessagingEditor({ messaging, onUpdate }: MessagingEditorProps) {
  const [localMessaging, setLocalMessaging] = useState<PortalMessaging>(messaging)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)

  const updateField = (key: keyof PortalMessaging, value: string) => {
    setLocalMessaging((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    startTransition(async () => {
      await onUpdate(localMessaging)
      setHasChanges(false)
    })
  }

  const handleReset = () => {
    setLocalMessaging(DEFAULT_PORTAL_MESSAGING)
    setHasChanges(true)
  }

  const handleResetField = (key: keyof PortalMessaging) => {
    updateField(key, DEFAULT_PORTAL_MESSAGING[key])
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Customize text and messaging throughout the customer portal.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            <CornerUpLeft className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          <Button onClick={handleSave} disabled={isPending || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Variable Help */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Using Variables</h4>
              <p className="mt-1 text-sm text-blue-700">
                Some fields support dynamic variables using the{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">
                  {'{{variableName}}'}
                </code>{' '}
                syntax. Available variables are shown below each field.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messaging Fields */}
      <div className="space-y-4">
        {MESSAGING_FIELDS.map((field) => (
          <MessagingFieldRow
            key={field.key}
            field={field}
            value={localMessaging[field.key]}
            defaultValue={DEFAULT_PORTAL_MESSAGING[field.key]}
            onChange={(value) => updateField(field.key, value)}
            onReset={() => handleResetField(field.key)}
          />
        ))}
      </div>
    </div>
  )
}

interface MessagingFieldRowProps {
  field: MessagingField
  value: string
  defaultValue: string
  onChange: (value: string) => void
  onReset: () => void
}

function MessagingFieldRow({
  field,
  value,
  defaultValue,
  onChange,
  onReset,
}: MessagingFieldRowProps) {
  const isModified = value !== defaultValue

  return (
    <Card className={cn('transition-colors', isModified && 'border-amber-300 bg-amber-50/30')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{field.label}</Label>
              {isModified && (
                <span className="text-xs text-amber-600 font-medium">Modified</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
          </div>
          {isModified && (
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
              Reset
            </Button>
          )}
        </div>

        {field.multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
          />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}

        {field.variables && field.variables.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Variables:</span>
            {field.variables.map((variable) => (
              <code
                key={variable}
                className="rounded bg-muted px-1.5 py-0.5 font-mono cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  onChange(value + `{{${variable}}}`)
                }}
                title={`Click to insert {{${variable}}}`}
              >
                {`{{${variable}}}`}
              </code>
            ))}
          </div>
        )}

        {value !== defaultValue && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Default:</span> {defaultValue}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
