'use client'

import { Badge, Button, cn } from '@cgk/ui'
import { Clock, Loader2, Mail, MailCheck, RotateCcw, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { TeamInvitation } from './types'

import { formatDate, formatDateTime } from '@/lib/format'


interface PendingInvitationsTableProps {
  invitations: TeamInvitation[]
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  revoked: 'bg-red-100 text-red-800',
} as const

const STATUS_ICONS = {
  pending: Clock,
  accepted: MailCheck,
  expired: Clock,
  revoked: X,
} as const

export function PendingInvitationsTable({
  invitations,
}: PendingInvitationsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleResend(invitationId: string) {
    setLoading(invitationId)
    try {
      const response = await fetch(
        `/api/admin/team/invitations/${invitationId}/resend`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend invitation')
      }

      router.refresh()
      alert('Invitation resent successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to resend')
    } finally {
      setLoading(null)
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    setLoading(invitationId)
    try {
      const response = await fetch(`/api/admin/team/invitations/${invitationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke invitation')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to revoke')
    } finally {
      setLoading(null)
    }
  }

  function isExpired(expiresAt: Date | string): boolean {
    return new Date(expiresAt) < new Date()
  }

  function getTimeRemaining(expiresAt: Date | string): string {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return 'Less than 1h remaining'
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No pending invitations</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite team members to see pending invitations here
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Email
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
              Role
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
              Status
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
              Sent
            </th>
            <th className="w-24 px-4 py-3 text-right font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invitations.map((invitation) => {
            const StatusIcon = STATUS_ICONS[invitation.status] || Clock
            const statusColor = STATUS_COLORS[invitation.status] || STATUS_COLORS.pending
            const expired = invitation.status === 'pending' && isExpired(invitation.expiresAt)
            const isLoading = loading === invitation.id

            return (
              <tr
                key={invitation.id}
                className={cn('hover:bg-muted/50', isLoading && 'opacity-50')}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge variant="outline" className="capitalize">
                    {invitation.role}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {expired ? (
                    <Badge variant="outline" className="gap-1 bg-gray-100 text-gray-800">
                      <Clock className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : (
                    <div>
                      <Badge variant="outline" className={cn('gap-1', statusColor)}>
                        <StatusIcon className="h-3 w-3" />
                        <span className="capitalize">{invitation.status}</span>
                      </Badge>
                      {invitation.status === 'pending' && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {getTimeRemaining(invitation.expiresAt)}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="text-muted-foreground">
                    {formatDate(invitation.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires {formatDateTime(invitation.expiresAt)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {invitation.status === 'pending' && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(invitation.id)}
                        disabled={isLoading}
                        title="Resend invitation"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invitation.id)}
                        disabled={isLoading}
                        title="Revoke invitation"
                        className="text-red-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
