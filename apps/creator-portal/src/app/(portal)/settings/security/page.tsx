'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Spinner } from '@cgk-platform/ui'
import { useEffect, useState } from 'react'


import { SessionCard } from '@/components/settings/SessionCard'

interface Session {
  id: string
  deviceInfo: string
  deviceType: string
  ipAddress: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

export default function SecuritySettingsPage(): React.JSX.Element {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  // Fetch sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/creator/sessions')
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load sessions')
        }
        const data = await response.json()
        setSessions(data.sessions)
      } catch (err) {
        console.error('Error fetching sessions:', err)
      } finally {
        setIsLoadingSessions(false)
      }
    }

    fetchSessions()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    // Validate
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch('/api/creator/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/creator/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to revoke session')

      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      console.error('Error revoking session:', err)
    }
  }

  const handleRevokeAllOther = async () => {
    setIsRevokingAll(true)

    try {
      const response = await fetch('/api/creator/sessions', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to revoke sessions')

      // Keep only current session
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    } catch (err) {
      console.error('Error revoking sessions:', err)
    } finally {
      setIsRevokingAll(false)
    }
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Change Password</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isChangingPassword}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Manage your active sessions across devices
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAllOther}
              disabled={isRevokingAll}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {isRevokingAll ? 'Signing out...' : 'Sign out all other devices'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No active sessions
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  {...session}
                  onRevoke={handleRevokeSession}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
