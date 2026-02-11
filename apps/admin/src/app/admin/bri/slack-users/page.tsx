'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, Input, Badge, Alert, AlertDescription } from '@cgk/ui'
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface TeamMember {
  id: string
  name: string | null
  email: string
}

interface SlackUserLink {
  userId: string
  slackUserId: string
  slackUsername: string | null
  isAutoLinked: boolean
}

interface SlackUser {
  id: string
  username: string
  realName: string
  email: string | null
}

export default function SlackUsersPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [slackLinks, setSlackLinks] = useState<SlackUserLink[]>([])
  const [slackConnected, setSlackConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SlackUser[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/bri/slack-users')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.teamMembers ?? [])
        setSlackLinks(data.slackLinks ?? [])
        setSlackConnected(data.slackConnected ?? false)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchSlackUsers = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const response = await fetch(`/api/admin/bri/slack-users/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users ?? [])
      }
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setSearching(false)
    }
  }

  const linkUser = async (userId: string, slackUserId: string, slackUsername: string) => {
    try {
      const response = await fetch('/api/admin/bri/slack-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, slackUserId, slackUsername }),
      })
      if (response.ok) {
        setSlackLinks([
          ...slackLinks.filter((l) => l.userId !== userId),
          { userId, slackUserId, slackUsername, isAutoLinked: false },
        ])
      }
    } catch (error) {
      console.error('Failed to link user:', error)
    }
  }

  const unlinkUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/bri/slack-users?userId=${userId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSlackLinks(slackLinks.filter((l) => l.userId !== userId))
      }
    } catch (error) {
      console.error('Failed to unlink user:', error)
    }
  }

  const getSlackLink = (userId: string) => slackLinks.find((l) => l.userId === userId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!slackConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Slack Users</h1>
          <p className="text-sm text-muted-foreground">Map Slack users to internal team members</p>
        </div>

        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Slack is not connected. Please{' '}
            <Link href="/admin/bri/integrations" className="underline">
              connect Slack
            </Link>{' '}
            to manage user mapping.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Slack Users</h1>
        <p className="text-sm text-muted-foreground">Map Slack users to internal team members</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Members */}
        <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <h3 className="text-sm font-medium">Team Members</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <div className="divide-y">
              {teamMembers.map((member) => {
                const link = getSlackLink(member.id)
                return (
                  <div key={member.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{member.name ?? member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {link ? (
                        <>
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            @{link.slackUsername}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkUser(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Unlink
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">Not linked</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search Slack Users */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Slack Users
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or username"
                  onKeyDown={(e) => e.key === 'Enter' && searchSlackUsers()}
                />
                <Button onClick={searchSlackUsers} disabled={searching}>
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">@{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.realName}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                      <select
                        className="text-xs border rounded px-2 py-1"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            linkUser(e.target.value, user.id, user.username)
                          }
                        }}
                      >
                        <option value="">Link to...</option>
                        {teamMembers
                          .filter((m) => !getSlackLink(m.id))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name ?? m.email}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">How Linking Works</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Auto-linking:</strong> When Slack is connected, Bri automatically links
                users based on matching email addresses.
              </p>
              <p>
                <strong>Manual override:</strong> Use the search above to manually link users
                when email addresses don't match.
              </p>
              <p>
                <strong>@mentions:</strong> When linked, Bri can @mention team members in Slack
                messages and route approvals correctly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
