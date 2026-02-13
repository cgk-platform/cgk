'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Select, SelectOption } from '@cgk-platform/ui'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar } from 'lucide-react'

interface TimeSlot {
  start: string
  end: string
}

interface WeeklySchedule {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

interface BlockedDate {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  isAllDay: boolean
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

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

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE)
  const [timezone, setTimezone] = useState('America/New_York')
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])

  // New blocked date form
  const [newBlockedStartDate, setNewBlockedStartDate] = useState('')
  const [newBlockedEndDate, setNewBlockedEndDate] = useState('')
  const [newBlockedReason, setNewBlockedReason] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [availabilityRes, blockedRes] = await Promise.all([
          fetch('/api/admin/scheduling/availability'),
          fetch('/api/admin/scheduling/blocked-dates'),
        ])

        if (availabilityRes.ok) {
          const data = await availabilityRes.json()
          if (data.availability) {
            setSchedule(data.availability.weeklySchedule)
            setTimezone(data.availability.timezone)
          }
        }

        if (blockedRes.ok) {
          const data = await blockedRes.json()
          setBlockedDates(data.blockedDates || [])
        }
      } catch {
        setError('Failed to load availability')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/scheduling/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, timezone }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save availability')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const addTimeSlot = (day: keyof WeeklySchedule) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: '09:00', end: '17:00' }],
    }))
  }

  const removeTimeSlot = (day: keyof WeeklySchedule, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  const updateTimeSlot = (
    day: keyof WeeklySchedule,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }))
  }

  const addBlockedDate = async () => {
    if (!newBlockedStartDate || !newBlockedEndDate) return

    try {
      const response = await fetch('/api/admin/scheduling/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: newBlockedStartDate,
          endDate: newBlockedEndDate,
          reason: newBlockedReason || null,
          isAllDay: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add blocked date')
      }

      const data = await response.json()
      setBlockedDates((prev) => [...prev, data.blockedDate])
      setNewBlockedStartDate('')
      setNewBlockedEndDate('')
      setNewBlockedReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const removeBlockedDate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/scheduling/blocked-dates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove blocked date')
      }

      setBlockedDates((prev) => prev.filter((bd) => bd.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-muted-foreground">
            Set your weekly availability schedule
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900 dark:text-green-100">
          Availability saved successfully
        </div>
      )}

      {/* Timezone */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Timezone</h2>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <SelectOption key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </SelectOption>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Weekly Schedule</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{label}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addTimeSlot(key)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {schedule[key].length === 0 ? (
                <p className="text-sm text-muted-foreground">Unavailable</p>
              ) : (
                <div className="space-y-2">
                  {schedule[key].map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeSlot(key, index)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Blocked Dates</h2>
          <p className="text-sm text-muted-foreground">
            Block dates when you are unavailable (PTO, holidays, etc.)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new blocked date */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={newBlockedStartDate}
                onChange={(e) => setNewBlockedStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={newBlockedEndDate}
                onChange={(e) => setNewBlockedEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Reason (optional)</Label>
              <Input
                value={newBlockedReason}
                onChange={(e) => setNewBlockedReason(e.target.value)}
                placeholder="e.g., Vacation"
              />
            </div>
            <Button
              onClick={addBlockedDate}
              disabled={!newBlockedStartDate || !newBlockedEndDate}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* List of blocked dates */}
          {blockedDates.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No blocked dates
            </p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((blocked) => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {blocked.startDate === blocked.endDate
                          ? blocked.startDate
                          : `${blocked.startDate} - ${blocked.endDate}`}
                      </p>
                      {blocked.reason && (
                        <p className="text-sm text-muted-foreground">{blocked.reason}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlockedDate(blocked.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
