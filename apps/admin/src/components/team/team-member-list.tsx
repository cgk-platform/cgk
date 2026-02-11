'use client'

import { Badge, Button, cn } from '@cgk/ui'
import {
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { TeamMember } from './types'

import { formatDate } from '@/lib/format'


interface TeamMemberListProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: string
}

const ROLE_ICONS = {
  owner: ShieldCheck,
  admin: Shield,
  member: Users,
} as const

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
} as const

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-800',
} as const

export function TeamMemberList({
  members,
  currentUserId,
  currentUserRole,
}: TeamMemberListProps) {
  const router = useRouter()
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'super_admin'

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    setLoading(memberId)
    try {
      const response = await fetch(`/api/admin/team/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove member')
    } finally {
      setLoading(null)
      setActionMenuOpen(null)
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    setLoading(memberId)
    try {
      const response = await fetch(`/api/admin/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change role')
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to change role')
    } finally {
      setLoading(null)
      setActionMenuOpen(null)
    }
  }

  function getInitials(name: string | null, email: string): string {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return (email[0] ?? '?').toUpperCase()
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No team members</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite team members to get started
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
              Member
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
              Role
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
              Status
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
              Joined
            </th>
            {canManageTeam && (
              <th className="w-12 px-4 py-3 text-right font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS] || Users
            const roleLabel = ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role
            const roleColor = ROLE_COLORS[member.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.member
            const isCurrentUser = member.userId === currentUserId
            const isLoading = loading === member.userId

            return (
              <tr
                key={member.id}
                className={cn('hover:bg-muted/50', isLoading && 'opacity-50')}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-medium">
                      {getInitials(member.name, member.email)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.name || member.email.split('@')[0]}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge variant="outline" className={cn('gap-1', roleColor)}>
                    <RoleIcon className="h-3 w-3" />
                    {roleLabel}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <Badge
                    variant={member.status === 'active' ? 'default' : 'outline'}
                    className={cn(
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    <span
                      className={cn(
                        'mr-1 h-1.5 w-1.5 rounded-full',
                        member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    />
                    {member.status === 'active' ? 'Active' : 'Invited'}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {member.joinedAt ? formatDate(member.joinedAt) : '-'}
                </td>
                {canManageTeam && (
                  <td className="px-4 py-3 text-right">
                    {!isCurrentUser && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === member.userId ? null : member.userId
                            )
                          }
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {actionMenuOpen === member.userId && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuOpen(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
                              {member.role !== 'owner' && (
                                <button
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => handleChangeRole(member.userId, 'owner')}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Make Owner
                                </button>
                              )}
                              {member.role !== 'admin' && (
                                <button
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => handleChangeRole(member.userId, 'admin')}
                                >
                                  <Shield className="h-4 w-4" />
                                  Make Admin
                                </button>
                              )}
                              {member.role !== 'member' && (
                                <button
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => handleChangeRole(member.userId, 'member')}
                                >
                                  <UserCog className="h-4 w-4" />
                                  Make Member
                                </button>
                              )}
                              <hr className="my-1" />
                              <button
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
