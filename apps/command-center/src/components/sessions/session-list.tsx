'use client'

import { StatusBadge } from '@cgk-platform/ui'

interface Session {
  id: string
  type: string
  agentId?: string
  createdAt: string
  lastActivity?: string
  messageCount: number
  tokenUsage?: { input: number; output: number; total: number }
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
            <th className="p-3 text-left font-medium">ID</th>
            <th className="p-3 text-left font-medium">Type</th>
            <th className="p-3 text-left font-medium">Agent</th>
            <th className="p-3 text-left font-medium">Created</th>
            <th className="p-3 text-right font-medium">Messages</th>
            <th className="p-3 text-right font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b transition-colors hover:bg-accent/50">
              <td className="p-3 font-mono text-xs">{session.id.slice(0, 12)}...</td>
              <td className="p-3">
                <StatusBadge status={session.type} />
              </td>
              <td className="p-3 text-muted-foreground">
                {session.agentId || 'default'}
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {new Date(session.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="p-3 text-right font-mono">{session.messageCount}</td>
              <td className="p-3 text-right font-mono text-xs">
                {session.tokenUsage
                  ? session.tokenUsage.total.toLocaleString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
