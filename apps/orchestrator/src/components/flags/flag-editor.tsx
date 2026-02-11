'use client'

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Switch,
  Textarea,
} from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import type { FeatureFlag, FlagAuditEntry, FlagOverride } from '@cgk/feature-flags'

interface FlagEditorProps {
  flagKey: string
  onUpdate: () => void
}

interface FlagDetailResponse {
  flag: FeatureFlag
  overrides: FlagOverride[]
  auditLog: FlagAuditEntry[]
}

const ROLLOUT_PRESETS = [0, 10, 25, 50, 75, 100]

export function FlagEditor({ flagKey, onUpdate }: FlagEditorProps) {
  const [data, setData] = useState<FlagDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Edit states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [percentage, setPercentage] = useState(0)
  const [defaultValue, setDefaultValue] = useState<boolean>(false)

  // Kill switch
  const [showKillConfirm, setShowKillConfirm] = useState(false)
  const [killReason, setKillReason] = useState('')

  const fetchFlag = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/flags/${flagKey}`)
      if (!response.ok) {
        throw new Error('Failed to fetch flag')
      }

      const result = (await response.json()) as FlagDetailResponse
      setData(result)

      // Initialize edit states
      setName(result.flag.name)
      setDescription(result.flag.description || '')
      setPercentage(result.flag.targeting.percentage || 0)
      setDefaultValue(result.flag.defaultValue === true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [flagKey])

  useEffect(() => {
    fetchFlag()
  }, [fetchFlag])

  const handleSave = async () => {
    if (!data) return

    setIsSaving(true)
    try {
      const updates: Record<string, unknown> = {}

      if (name !== data.flag.name) updates.name = name
      if (description !== data.flag.description) updates.description = description
      if (
        data.flag.type === 'percentage' &&
        percentage !== (data.flag.targeting.percentage || 0)
      ) {
        updates.targeting = { percentage }
      }
      if (data.flag.type === 'boolean' && defaultValue !== data.flag.defaultValue) {
        updates.defaultValue = defaultValue
      }

      const response = await fetch(`/api/platform/flags/${flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update flag')
      }

      await fetchFlag()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKillSwitch = async () => {
    if (!killReason.trim()) {
      setError('Reason is required for kill switch')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/platform/flags/${flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killSwitch: true, reason: killReason }),
      })

      if (!response.ok) {
        throw new Error('Failed to activate kill switch')
      }

      setShowKillConfirm(false)
      setKillReason('')
      await fetchFlag()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!data) return

    setIsSaving(true)
    try {
      const newStatus = data.flag.status === 'active' ? 'disabled' : 'active'
      const response = await fetch(`/api/platform/flags/${flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update flag status')
      }

      await fetchFlag()
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error || 'Flag not found'}</p>
        </CardContent>
      </Card>
    )
  }

  const { flag, overrides, auditLog } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{flag.name}</h2>
          <p className="font-mono text-sm text-muted-foreground">{flag.key}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={flag.status === 'active' ? 'default' : 'destructive'}>
            {flag.status}
          </Badge>
          <Button
            variant={flag.status === 'active' ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={isSaving}
          >
            {flag.status === 'active' ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Settings</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Type-specific controls */}
          {flag.type === 'boolean' && (
            <div className="flex items-center gap-2">
              <Switch
                id="defaultValue"
                checked={defaultValue}
                onCheckedChange={setDefaultValue}
              />
              <Label htmlFor="defaultValue">Default Value (On/Off)</Label>
            </div>
          )}

          {flag.type === 'percentage' && (
            <div>
              <Label>Rollout Percentage: {percentage}%</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-1 mt-2">
                {ROLLOUT_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    variant={percentage === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPercentage(preset)}
                  >
                    {preset}%
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Kill Switch */}
      <Card className="border-destructive">
        <CardHeader>
          <h3 className="font-semibold text-destructive">Emergency Kill Switch</h3>
        </CardHeader>
        <CardContent>
          {showKillConfirm ? (
            <div className="space-y-4">
              <Alert variant="error">
                <AlertDescription>
                  This will immediately disable the flag for ALL users. This action
                  will be logged.
                </AlertDescription>
              </Alert>
              <div>
                <Label htmlFor="killReason">Reason (required)</Label>
                <Textarea
                  id="killReason"
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  placeholder="Why are you disabling this flag?"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleKillSwitch} disabled={isSaving}>
                  Confirm Kill Switch
                </Button>
                <Button variant="outline" onClick={() => setShowKillConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setShowKillConfirm(true)}
              disabled={flag.status === 'disabled'}
            >
              Activate Kill Switch
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Overrides */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Overrides ({overrides.length})</h3>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-muted-foreground">No overrides configured</p>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div>
                    <span className="font-medium">
                      {override.tenantId && `Tenant: ${override.tenantId}`}
                      {override.userId && `User: ${override.userId}`}
                    </span>
                    <span className="ml-2">
                      = {String(override.value)}
                    </span>
                  </div>
                  {override.expiresAt && (
                    <Badge variant="outline">
                      Expires: {new Date(override.expiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-muted-foreground">No activity recorded</p>
          ) : (
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-2 rounded border"
                >
                  <div>
                    <Badge
                      variant={entry.action === 'kill_switch' ? 'destructive' : 'secondary'}
                    >
                      {entry.action}
                    </Badge>
                    {entry.reason && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {entry.reason}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
