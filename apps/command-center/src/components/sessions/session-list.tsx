'use client'

import { StatusBadge } from '@cgk-platform/ui'

interface Session {
  id: string
  type: string
  displayName?: string
  channel?: string
  groupChannel?: string
  agentId?: string
}

const SESSION_TYPE_MAP: Record<string, string> = {
  main: 'active',
  isolated: 'pending',
  group: 'connected',
}

interface SessionListProps {
  sessions: Session[]
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No active sessions
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium">Session</th>
            <th className="p-3 text-left font-medium">Type</th>
            <th className="p-3 text-left font-medium">Channel</th>
            <th className="p-3 text-left font-medium">Agent</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b transition-colors hover:bg-accent/50">
              <td className="max-w-xs truncate p-3 text-xs">
                {session.displayName || session.id}
              </td>
              <td className="p-3">
                <StatusBadge status={SESSION_TYPE_MAP[session.type] || 'ready'} label={session.type} />
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {session.groupChannel || session.channel || '-'}
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {session.agentId || 'default'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
