'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, Badge } from '@cgk/ui'
import { Users, Save, Star, DollarSign, Eye } from 'lucide-react'

interface TeamMember {
  id: string
  name: string | null
  email: string
  slackLinked?: boolean
}

interface TeamDefaults {
  primaryContactId: string | null
  secondaryContactIds: string[]
  defaultReviewerIds: string[]
  financeContactId: string | null
}

export default function TeamDefaultsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [defaults, setDefaults] = useState<TeamDefaults>({
    primaryContactId: null,
    secondaryContactIds: [],
    defaultReviewerIds: [],
    financeContactId: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/bri/team-defaults')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.teamMembers ?? [])
        if (data.defaults) {
          setDefaults(data.defaults)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/bri/team-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults),
      })
    } catch (error) {
      console.error('Failed to save defaults:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSecondary = (id: string) => {
    setDefaults({
      ...defaults,
      secondaryContactIds: defaults.secondaryContactIds.includes(id)
        ? defaults.secondaryContactIds.filter((i) => i !== id)
        : [...defaults.secondaryContactIds, id],
    })
  }

  const toggleReviewer = (id: string) => {
    setDefaults({
      ...defaults,
      defaultReviewerIds: defaults.defaultReviewerIds.includes(id)
        ? defaults.defaultReviewerIds.filter((i) => i !== id)
        : [...defaults.defaultReviewerIds, id],
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Defaults</h1>
          <p className="text-sm text-muted-foreground">Set default team assignments for new projects</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Primary Contact */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Primary Contact
            </h3>
            <p className="text-xs text-muted-foreground">Main point of contact for creators</p>
          </CardHeader>
          <CardContent>
            <select
              value={defaults.primaryContactId ?? ''}
              onChange={(e) => setDefaults({ ...defaults, primaryContactId: e.target.value || null })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">Select primary contact</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.email}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Finance Contact */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Finance Contact
            </h3>
            <p className="text-xs text-muted-foreground">Notified for payment-related actions</p>
          </CardHeader>
          <CardContent>
            <select
              value={defaults.financeContactId ?? ''}
              onChange={(e) => setDefaults({ ...defaults, financeContactId: e.target.value || null })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="">Select finance contact</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.email}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Secondary Contacts */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Secondary Contacts
            </h3>
            <p className="text-xs text-muted-foreground">CC'd on most notifications, serves as backup</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaults.secondaryContactIds.includes(member.id)}
                    onChange={() => toggleSecondary(member.id)}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{member.name ?? member.email}</span>
                  {member.slackLinked && (
                    <Badge variant="success" className="text-[10px]">Slack</Badge>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Default Reviewers */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Default Reviewers
            </h3>
            <p className="text-xs text-muted-foreground">Notified when content is submitted</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defaults.defaultReviewerIds.includes(member.id)}
                    onChange={() => toggleReviewer(member.id)}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{member.name ?? member.email}</span>
                  {member.slackLinked && (
                    <Badge variant="success" className="text-[10px]">Slack</Badge>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium">How Team Defaults Work</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <h4 className="font-medium mb-1">Primary Contact</h4>
              <p className="text-muted-foreground">
                The main point of contact for creators. Mentioned first in Slack notifications and
                tagged on important updates.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Secondary Contacts</h4>
              <p className="text-muted-foreground">
                CC'd on most notifications and serve as backup when the primary contact is unavailable.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Default Reviewers</h4>
              <p className="text-muted-foreground">
                Automatically notified when creators submit content for review.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Finance Contact</h4>
              <p className="text-muted-foreground">
                Notified for payment-related actions like payout approvals and budget alerts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
