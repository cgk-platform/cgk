'use client'

import { cn } from '@cgk-platform/ui'

interface ConnectionBarProps {
  profiles: Record<string, { connected: boolean; error?: string }>
}

const PROFILE_LABELS: Record<string, string> = {
  cgk: 'CGK',
  rawdog: 'RAWDOG',
  vitahustle: 'VitaHustle',
}

export function ConnectionBar({ profiles }: ConnectionBarProps) {
  const allConnected = Object.values(profiles).every((p) => p.connected)
  const noneConnected = Object.values(profiles).every((p) => !p.connected)

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-lg border px-4 py-2 text-sm',
      allConnected && 'border-success/20 bg-success/5',
      noneConnected && 'border-destructive/20 bg-destructive/5',
      !allConnected && !noneConnected && 'border-warning/20 bg-warning/5'
    )}>
      <span className="font-medium text-muted-foreground">Gateways:</span>
      {Object.entries(profiles).map(([slug, status]) => (
        <div key={slug} className="flex items-center gap-1.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              status.connected ? 'bg-success' : 'bg-destructive'
            )}
          />
          <span className={cn(
            status.connected ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {PROFILE_LABELS[slug] || slug}
          </span>
        </div>
      ))}
    </div>
  )
}
