'use client'

import { useRouter } from 'next/navigation'
import type { SupportAgent } from '@cgk-platform/support'

import { AgentList } from '@/components/support/agent-list'

interface AgentListClientWrapperProps {
  agents: SupportAgent[]
}

export function AgentListClientWrapper({ agents }: AgentListClientWrapperProps) {
  const router = useRouter()

  const handleEdit = (agent: SupportAgent) => {
    // Navigate to edit page or open modal
    router.push(`/admin/support/agents/${agent.id}/edit`)
  }

  const handleDelete = async (agentId: string) => {
    try {
      const response = await fetch(`/api/admin/support/agents/${agentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        alert('Failed to delete agent')
        return
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting agent:', error)
      alert('Failed to delete agent')
    }
  }

  const handleToggleActive = async (agentId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/support/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        alert('Failed to update agent')
        return
      }

      router.refresh()
    } catch (error) {
      console.error('Error updating agent:', error)
      alert('Failed to update agent')
    }
  }

  return (
    <AgentList
      agents={agents}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
    />
  )
}
