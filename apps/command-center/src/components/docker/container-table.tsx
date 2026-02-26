'use client'

import { Button, cn, StatusBadge } from '@cgk-platform/ui'
import { FileText, Square } from 'lucide-react'
import { useState } from 'react'

interface ContainerInfo {
  id: string
  name: string
  status: string
  state: string
  image: string
  created: string
  ports: string
  profile: string
}

interface ContainerStats {
  containerId: string
  cpuPerc: string
  memUsage: string
  memPerc: string
  netIO: string
}

const PROFILE_COLORS: Record<string, string> = {
  cgk: 'bg-blue-500/15 text-blue-400',
  rawdog: 'bg-orange-500/15 text-orange-400',
  vitahustle: 'bg-emerald-500/15 text-emerald-400',
}

interface ContainerTableProps {
  containers: ContainerInfo[]
  stats: ContainerStats[]
  onStop: (id: string) => Promise<void>
  onViewLogs: (id: string) => void
}

export function ContainerTable({ containers, stats, onStop, onViewLogs }: ContainerTableProps) {
  const [stopping, setStopping] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState<string | null>(null)

  const statsMap = new Map(stats.map((s) => [s.containerId, s]))

  if (containers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No sandbox containers running
      </div>
    )
  }

  async function handleStop(id: string) {
    if (confirmStop !== id) {
      setConfirmStop(id)
      return
    }
    setStopping(id)
    setConfirmStop(null)
    try {
      await onStop(id)
    } finally {
      setStopping(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Name</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Uptime</th>
            <th className="p-3 text-left font-medium">CPU</th>
            <th className="p-3 text-left font-medium">Memory</th>
            <th className="p-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => {
            const st = statsMap.get(c.id)
            return (
              <tr key={c.id} className="border-b transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                        PROFILE_COLORS[c.profile] || 'text-muted-foreground'
                      )}
                    >
                      {c.profile}
                    </span>
                    <span className="truncate text-xs font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge
                    status={c.state === 'running' ? 'active' : c.state === 'exited' ? 'failed' : 'pending'}
                    label={c.state}
                  />
                </td>
                <td className="p-3 text-xs text-muted-foreground">{c.status}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {st?.cpuPerc || '-'}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>{st?.memUsage || '-'}</div>
                  {st?.memPerc && (
                    <div className="font-mono text-muted-foreground/60">{st.memPerc}</div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewLogs(c.id)}
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Logs
                    </Button>
                    <Button
                      variant={confirmStop === c.id ? 'destructive' : 'ghost'}
                      size="sm"
                      onClick={() => handleStop(c.id)}
                      disabled={stopping === c.id}
                    >
                      <Square className="mr-1 h-3 w-3" />
                      {stopping === c.id ? 'Stopping...' : confirmStop === c.id ? 'Confirm' : 'Stop'}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
