'use client'

import { useState } from 'react'
import { Button, Badge, cn } from '@cgk/ui'
import { MoreVertical, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import type { SupportAgent } from '@cgk/support'

interface AgentListProps {
  agents: SupportAgent[]
  onEdit?: (agent: SupportAgent) => void
  onDelete?: (agentId: string) => void
  onToggleActive?: (agentId: string, isActive: boolean) => void
  className?: string
}

export function AgentList({
  agents,
  onEdit,
  onDelete,
  onToggleActive,
  className,
}: AgentListProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const getRoleBadge = (role: SupportAgent['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">Admin</Badge>
      case 'lead':
        return <Badge variant="secondary">Lead</Badge>
      default:
        return <Badge variant="outline">Agent</Badge>
    }
  }

  return (
    <div className={cn('overflow-x-auto rounded-md border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Capacity</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Skills</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[60px]">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {agents.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No agents found
              </td>
            </tr>
          ) : (
            agents.map((agent) => {
              const capacityPercent = (agent.currentTicketCount / agent.maxTickets) * 100
              const capacityColor =
                capacityPercent >= 90
                  ? 'bg-red-500'
                  : capacityPercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'

              return (
                <tr key={agent.id} className="hover:bg-muted/50">
                  {/* Agent info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        {/* Online indicator */}
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                            agent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                          )}
                          title={agent.isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">{getRoleBadge(agent.role)}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {agent.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Capacity */}
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="tabular-nums">
                          {agent.currentTicketCount}/{agent.maxTickets}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(capacityPercent)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', capacityColor)}
                          style={{ width: `${Math.min(100, capacityPercent)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Skills */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {agent.skills.length > 0 ? (
                        agent.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {agent.skills.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{agent.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenMenu(openMenu === agent.id ? null : agent.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {openMenu === agent.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 z-50 mt-1 w-40 rounded-md border bg-popover shadow-lg">
                            <div className="p-1">
                              {onEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEdit(agent)
                                    setOpenMenu(null)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>
                              )}
                              {onToggleActive && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onToggleActive(agent.id, !agent.isActive)
                                    setOpenMenu(null)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                >
                                  {agent.isActive ? (
                                    <>
                                      <PowerOff className="h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this agent?')) {
                                      onDelete(agent.id)
                                    }
                                    setOpenMenu(null)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
