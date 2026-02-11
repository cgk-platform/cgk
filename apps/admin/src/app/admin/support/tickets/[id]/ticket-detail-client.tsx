'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@cgk/ui'
import { Loader2 } from 'lucide-react'
import type { TicketComment, TicketStatus, TicketPriority } from '@cgk/support'

import { CommentThread } from '@/components/support/comment-thread'
import { AgentSelector } from '@/components/support/agent-selector'

interface TicketDetailClientProps {
  ticketId: string
  initialComments: TicketComment[]
  initialStatus: TicketStatus
  initialPriority: TicketPriority
  initialAssignedTo: string | null
}

export function TicketDetailClient({
  ticketId,
  initialComments,
  initialStatus,
  initialPriority,
  initialAssignedTo,
}: TicketDetailClientProps) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState(initialPriority)
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo)
  const [updating, setUpdating] = useState(false)

  const handleAddComment = async (content: string, isInternal: boolean) => {
    const response = await fetch(`/api/admin/support/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, isInternal }),
    })

    if (!response.ok) {
      throw new Error('Failed to add comment')
    }

    const newComment = await response.json()
    setComments((prev) => [...prev, newComment])
    router.refresh()
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to update status')
        return
      }

      setStatus(newStatus)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!response.ok) {
        alert('Failed to update priority')
        return
      }

      setPriority(newPriority)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  const handleAssign = async (agentId: string | null) => {
    setUpdating(true)
    try {
      if (agentId) {
        const response = await fetch(`/api/admin/support/tickets/${ticketId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        })

        if (!response.ok) {
          alert('Failed to assign ticket')
          return
        }
      } else {
        const response = await fetch(`/api/admin/support/tickets/${ticketId}/assign`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          alert('Failed to unassign ticket')
          return
        }
      }

      setAssignedTo(agentId)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  const handleAutoAssign = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to auto-assign')
        return
      }

      const data = await response.json()
      setAssignedTo(data.agentId)
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
        {/* Status Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
            disabled={updating}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Priority:</span>
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
            disabled={updating}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Assigned:</span>
          <AgentSelector
            currentAgentId={assignedTo}
            onSelect={handleAssign}
            onAutoAssign={handleAutoAssign}
            disabled={updating}
            className="w-48"
          />
        </div>

        {updating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {/* Quick Status Buttons */}
        <div className="flex-1 flex justify-end gap-2">
          {status === 'open' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('pending')}
              disabled={updating}
            >
              Mark Pending
            </Button>
          )}
          {(status === 'open' || status === 'pending') && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('resolved')}
              disabled={updating}
            >
              Resolve
            </Button>
          )}
          {status === 'resolved' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('closed')}
              disabled={updating}
            >
              Close Ticket
            </Button>
          )}
          {(status === 'resolved' || status === 'closed') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('open')}
              disabled={updating}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Comment Thread */}
      <CommentThread
        ticketId={ticketId}
        comments={comments}
        onAddComment={handleAddComment}
      />
    </div>
  )
}
