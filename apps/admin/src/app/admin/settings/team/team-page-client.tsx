'use client'

import { Button, Card, CardContent } from '@cgk/ui'
import { Mail, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'

import {
  InviteMemberModal,
  PendingInvitationsTable,
  TeamMemberList,
  type RateLimit,
  type TeamInvitation,
  type TeamMember,
} from '@/components/team'

interface TeamPageClientProps {
  members: TeamMember[]
  invitations: TeamInvitation[]
  currentUserId: string
  currentUserRole: string
  rateLimit: RateLimit
}

export function TeamPageClient({
  members,
  invitations,
  currentUserId,
  currentUserRole,
  rateLimit,
}: TeamPageClientProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'super_admin'

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Team Management</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your team members and pending invitations.
              </p>
            </div>
            {canInvite && (
              <Button onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 flex border-b">
            <button
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('members')}
            >
              <Users className="h-4 w-4" />
              Members
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {members.length}
              </span>
            </button>
            <button
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('invitations')}
            >
              <Mail className="h-4 w-4" />
              Pending Invitations
              {invitations.length > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                  {invitations.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'members' ? (
              <TeamMemberList
                members={members}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ) : (
              <PendingInvitationsTable invitations={invitations} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rate Limit Info */}
      {canInvite && (
        <div className="text-center text-sm text-muted-foreground">
          {rateLimit.remaining > 0 ? (
            <>
              You can send {rateLimit.remaining} more invitation{rateLimit.remaining !== 1 ? 's' : ''} today.
            </>
          ) : (
            <span className="text-orange-600">
              Daily invitation limit reached. Try again tomorrow.
            </span>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        rateLimit={rateLimit}
      />
    </div>
  )
}
