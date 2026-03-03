'use client'

import { useState, useEffect } from 'react'
import { cn } from '@cgk-platform/ui'
import { ChevronDown, User, UserCheck, Users } from 'lucide-react'
import type { SupportAgent } from '@cgk-platform/support'

interface AgentSelectorProps {
  currentAgentId?: string | null
  onSelect: (agentId: string | null) => void
  onAutoAssign?: () => void
  className?: string
  disabled?: boolean
}

export function AgentSelector({
  currentAgentId,
  onSelect,
  onAutoAssign,
  className,
  disabled = false,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<SupportAgent | null>(null)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/admin/support/agents?isActive=true')
        if (response.ok) {
          const data = await response.json()
          setAgents(data.items || [])

          // Find current agent
          if (currentAgentId) {
            const current = data.items?.find((a: SupportAgent) => a.id === currentAgentId)
            setSelectedAgent(current || null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [currentAgentId])

  const handleSelect = (agent: SupportAgent | null) => {
    setSelectedAgent(agent)
    onSelect(agent?.id || null)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
          'bg-background hover:bg-muted transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-ring'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedAgent ? (
            <>
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  selectedAgent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                )}
              />
              <span className="truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Unassigned</span>
            </>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <div className="max-h-60 overflow-y-auto p-1">
              {/* Unassign option */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Unassigned</span>
              </button>

              {/* Auto-assign option */}
              {onAutoAssign && (
                <button
                  type="button"
                  onClick={() => {
                    onAutoAssign()
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted text-primary"
                >
                  <Users className="h-4 w-4" />
                  <span>Auto-assign</span>
                </button>
              )}

              {agents.length > 0 && (
                <div className="my-1 border-t" />
              )}

              {/* Agent list */}
              {loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : agents.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No agents available</div>
              ) : (
                agents.map((agent) => {
                  const atCapacity = agent.currentTicketCount >= agent.maxTickets
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleSelect(agent)}
                      disabled={atCapacity}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                        atCapacity
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-muted',
                        selectedAgent?.id === agent.id && 'bg-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          agent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                        )}
                      />
                      <span className="truncate flex-1 text-left">{agent.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {agent.currentTicketCount}/{agent.maxTickets}
                      </span>
                      {selectedAgent?.id === agent.id && (
                        <UserCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
