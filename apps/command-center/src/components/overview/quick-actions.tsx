'use client'

import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@cgk-platform/ui'
import { Activity, RefreshCw, Stethoscope, Trash2, Wrench } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ActionResult {
  ok: boolean
  stdout?: string
  stderr?: string
  error?: string
  results?: Array<{ script: string; ok: boolean; stdout: string; error?: string }>
}

interface ActionConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  endpoint: string
  confirm: string
  bodyFn?: () => Record<string, unknown>
}

const ACTIONS: ActionConfig[] = [
  {
    label: 'Restart All Gateways',
    icon: RefreshCw,
    endpoint: '/api/openclaw/actions/restart-gateway',
    confirm: 'Restart all 3 gateway processes?',
  },
  {
    label: 'Run Doctor',
    icon: Stethoscope,
    endpoint: '/api/openclaw/actions/doctor',
    confirm: 'Run openclaw doctor on default profile?',
  },
  {
    label: 'Reapply Patches',
    icon: Wrench,
    endpoint: '/api/openclaw/actions/reapply-patches',
    confirm: 'Reapply all 5 local patches?',
  },
  {
    label: 'Prune Containers',
    icon: Trash2,
    endpoint: '/api/openclaw/actions/prune-containers',
    confirm: 'Stop and remove all sandbox containers?',
  },
]

export function QuickActions() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [confirmAction, setConfirmAction] = useState<ActionConfig | null>(null)

  const execute = useCallback(async (action: ActionConfig) => {
    setConfirmAction(null)
    setRunning(action.endpoint)
    setResult(null)
    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.bodyFn?.() || {}),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setRunning(null)
    }
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon
            const isRunning = running === action.endpoint
            return (
              <Button
                key={action.endpoint}
                variant="outline"
                size="sm"
                disabled={running !== null}
                onClick={() => setConfirmAction(action)}
              >
                <Icon className={cn('mr-1.5 h-3.5 w-3.5', isRunning && 'animate-spin')} />
                {isRunning ? 'Running...' : action.label}
              </Button>
            )
          })}
        </div>

        {/* Confirmation dialog */}
        {confirmAction && (
          <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 p-3">
            <p className="text-sm">{confirmAction.confirm}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => execute(confirmAction)}>
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Result output */}
        {result && (
          <div className={cn(
            'mt-3 rounded-md border p-3',
            result.ok ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
          )}>
            <p className={cn('text-xs font-medium', result.ok ? 'text-success' : 'text-destructive')}>
              {result.ok ? 'Success' : 'Failed'}
            </p>
            {result.stdout && (
              <pre className="mt-1 max-h-40 overflow-auto text-xs text-muted-foreground">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="mt-1 max-h-40 overflow-auto text-xs text-warning">
                {result.stderr}
              </pre>
            )}
            {result.error && (
              <pre className="mt-1 max-h-40 overflow-auto text-xs text-destructive">
                {result.error}
              </pre>
            )}
            {result.results && (
              <div className="mt-1 space-y-1">
                {result.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={r.ok ? 'text-success' : 'text-destructive'}>
                      {r.ok ? '✓' : '✗'}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {r.script.split('/').pop()}
                    </span>
                    {r.error && <span className="text-destructive">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
