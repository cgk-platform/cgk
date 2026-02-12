'use client'

import { Switch, cn } from '@cgk/ui'
import { AlertTriangle } from 'lucide-react'
import { useState, useTransition } from 'react'

import type { PortalFeatures, FeatureToggleMeta } from '@/lib/customer-portal/types'
import { FEATURE_TOGGLES } from '@/lib/customer-portal/types'

interface FeatureTogglesProps {
  features: PortalFeatures
  onUpdate: (features: Partial<PortalFeatures>) => Promise<void>
}

export function FeatureToggles({ features, onUpdate }: FeatureTogglesProps) {
  const [localFeatures, setLocalFeatures] = useState<PortalFeatures>(features)
  const [isPending, startTransition] = useTransition()

  const coreFeatures = FEATURE_TOGGLES.filter((f) => f.category === 'core')
  const subscriptionFeatures = FEATURE_TOGGLES.filter((f) => f.category === 'subscription')

  const handleToggle = (key: keyof PortalFeatures, enabled: boolean) => {
    const updated = { ...localFeatures, [key]: enabled }
    setLocalFeatures(updated)

    startTransition(async () => {
      await onUpdate({ [key]: enabled })
    })
  }

  return (
    <div className="space-y-8">
      {/* Core Pages Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Core Pages
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Control which pages are visible to customers in their portal.
          </p>
        </div>
        <div className="space-y-1">
          {coreFeatures.map((toggle) => (
            <FeatureToggleRow
              key={toggle.key}
              toggle={toggle}
              enabled={localFeatures[toggle.key]}
              onChange={(enabled) => handleToggle(toggle.key, enabled)}
              disabled={isPending}
            />
          ))}
        </div>
      </section>

      {/* Subscription Actions Section */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Subscription Self-Service
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Control which subscription actions customers can perform without contacting support.
          </p>
        </div>
        <div className="space-y-1">
          {subscriptionFeatures.map((toggle) => (
            <FeatureToggleRow
              key={toggle.key}
              toggle={toggle}
              enabled={localFeatures[toggle.key]}
              onChange={(enabled) => handleToggle(toggle.key, enabled)}
              disabled={isPending}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

interface FeatureToggleRowProps {
  toggle: FeatureToggleMeta
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function FeatureToggleRow({ toggle, enabled, onChange, disabled }: FeatureToggleRowProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-4 rounded-lg border p-4 transition-colors',
        enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={toggle.label}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{toggle.label}</label>
          {toggle.warning && !enabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Warning
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{toggle.description}</p>
        {toggle.warning && !enabled && (
          <p className="mt-2 text-xs text-amber-600">{toggle.warning}</p>
        )}
      </div>
    </div>
  )
}
