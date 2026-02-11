'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Select, SelectOption } from '@cgk/ui'
import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface SchedulingProfile {
  id: string
  username: string
  displayName: string
  email: string
  timezone: string
  avatarUrl: string | null
  minimumNoticeHours: number
  bookingWindowDays: number
  bufferBeforeMins: number
  bufferAfterMins: number
  dailyLimit: number | null
  defaultDuration: number
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const DURATIONS = [15, 30, 45, 60, 90, 120]

export default function SchedulingSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [hasProfile, setHasProfile] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Profile fields
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Settings
  const [minimumNoticeHours, setMinimumNoticeHours] = useState('24')
  const [bookingWindowDays, setBookingWindowDays] = useState('60')
  const [bufferBeforeMins, setBufferBeforeMins] = useState('0')
  const [bufferAfterMins, setBufferAfterMins] = useState('15')
  const [dailyLimit, setDailyLimit] = useState('')
  const [defaultDuration, setDefaultDuration] = useState('30')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/admin/scheduling/users')
        if (response.ok) {
          const data = await response.json()
          if (data.users && data.users.length > 0) {
            const profile = data.users[0] as SchedulingProfile
            setHasProfile(true)
            setUsername(profile.username)
            setDisplayName(profile.displayName)
            setEmail(profile.email)
            setTimezone(profile.timezone)
            setAvatarUrl(profile.avatarUrl || '')
            setMinimumNoticeHours(profile.minimumNoticeHours.toString())
            setBookingWindowDays(profile.bookingWindowDays.toString())
            setBufferBeforeMins(profile.bufferBeforeMins.toString())
            setBufferAfterMins(profile.bufferAfterMins.toString())
            setDailyLimit(profile.dailyLimit?.toString() || '')
            setDefaultDuration(profile.defaultDuration.toString())
          }
        }
      } catch (err) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (!hasProfile) {
        // Create new profile
        const response = await fetch('/api/admin/scheduling/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'current', // Server will use authenticated user
            username,
            displayName,
            email,
            timezone,
            avatarUrl: avatarUrl || null,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create profile')
        }

        setHasProfile(true)
        setIsCreating(false)
      } else {
        // Update existing profile
        const response = await fetch(`/api/admin/scheduling/users/current`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            displayName,
            email,
            timezone,
            avatarUrl: avatarUrl || null,
            minimumNoticeHours: parseInt(minimumNoticeHours, 10),
            bookingWindowDays: parseInt(bookingWindowDays, 10),
            bufferBeforeMins: parseInt(bufferBeforeMins, 10),
            bufferAfterMins: parseInt(bufferAfterMins, 10),
            dailyLimit: dailyLimit ? parseInt(dailyLimit, 10) : null,
            defaultDuration: parseInt(defaultDuration, 10),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update profile')
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!hasProfile && !isCreating) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Scheduling Settings</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Create Your Scheduling Profile</h2>
            <p className="mt-2 text-muted-foreground">
              Set up your profile to start accepting bookings.
            </p>
            <Button className="mt-4" onClick={() => setIsCreating(true)}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Scheduling Settings</h1>
        <p className="text-muted-foreground">
          {hasProfile ? 'Manage your scheduling profile and preferences' : 'Create your scheduling profile'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900 dark:text-green-100">
          Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Profile Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (URL)</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="yourname"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your booking URL will be: /book/[org]/{username || 'yourname'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <SelectOption key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectOption>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        {hasProfile && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">Booking Settings</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minimumNoticeHours">Minimum Notice (hours)</Label>
                  <Input
                    id="minimumNoticeHours"
                    type="number"
                    min="0"
                    value={minimumNoticeHours}
                    onChange={(e) => setMinimumNoticeHours(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    How much advance notice you need for bookings
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookingWindowDays">Booking Window (days)</Label>
                  <Input
                    id="bookingWindowDays"
                    type="number"
                    min="1"
                    max="365"
                    value={bookingWindowDays}
                    onChange={(e) => setBookingWindowDays(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    How far in advance people can book
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bufferBeforeMins">Buffer Before (minutes)</Label>
                  <Input
                    id="bufferBeforeMins"
                    type="number"
                    min="0"
                    value={bufferBeforeMins}
                    onChange={(e) => setBufferBeforeMins(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferAfterMins">Buffer After (minutes)</Label>
                  <Input
                    id="bufferAfterMins"
                    type="number"
                    min="0"
                    value={bufferAfterMins}
                    onChange={(e) => setBufferAfterMins(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Limit (optional)</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min="1"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum bookings per day (leave empty for unlimited)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultDuration">Default Duration</Label>
                  <Select
                    id="defaultDuration"
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                  >
                    {DURATIONS.map((d) => (
                      <SelectOption key={d} value={d.toString()}>
                        {d} minutes
                      </SelectOption>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving || !displayName || !username || !email}>
            {saving ? 'Saving...' : hasProfile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
