'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Textarea, Select, SelectOption, Switch } from '@cgk/ui'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'

const DURATIONS = [15, 30, 45, 60, 90, 120]
const COLORS = [
  { value: 'blue', label: 'Blue', hex: '#3b82f6' },
  { value: 'green', label: 'Green', hex: '#22c55e' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'red', label: 'Red', hex: '#ef4444' },
  { value: 'mint', label: 'Mint', hex: '#34d399' },
  { value: 'gray', label: 'Gray', hex: '#6b7280' },
]

const LOCATION_TYPES = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'custom', label: 'Custom' },
]

interface EventType {
  id: string
  name: string
  slug: string
  description: string | null
  duration: number
  color: string
  location: { type: string; value?: string }
  isActive: boolean
}

export default function EditEventTypePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [color, setColor] = useState('blue')
  const [locationType, setLocationType] = useState('google_meet')
  const [locationValue, setLocationValue] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const fetchEventType = async () => {
      try {
        const response = await fetch(`/api/admin/scheduling/event-types/${id}`)
        if (!response.ok) throw new Error('Failed to fetch event type')

        const data = await response.json()
        const et = data.eventType as EventType

        setName(et.name)
        setSlug(et.slug)
        setDescription(et.description || '')
        setDuration(et.duration.toString())
        setColor(et.color)
        setLocationType(et.location.type)
        setLocationValue(et.location.value || '')
        setIsActive(et.isActive)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEventType()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/scheduling/event-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          duration: parseInt(duration, 10),
          color,
          location: {
            type: locationType,
            value: locationValue || undefined,
          },
          isActive,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update event type')
      }

      router.push('/admin/scheduling/event-types')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to archive this event type? It will no longer be available for booking.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/scheduling/event-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive event type')
      }

      router.push('/admin/scheduling/event-types')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/scheduling/event-types"
            className="rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Event Type</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Archive
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new bookings for this event type
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 30 Minute Meeting"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g., 30-min-meeting"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this meeting is for..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {DURATIONS.map((d) => (
                    <SelectOption key={d} value={d.toString()}>
                      {d} minutes
                    </SelectOption>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        color === c.value ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Location</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationType">Meeting Location</Label>
              <Select
                id="locationType"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                {LOCATION_TYPES.map((loc) => (
                  <SelectOption key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectOption>
                ))}
              </Select>
            </div>

            {(locationType === 'phone' || locationType === 'in_person' || locationType === 'custom') && (
              <div className="space-y-2">
                <Label htmlFor="locationValue">
                  {locationType === 'phone'
                    ? 'Phone Number'
                    : locationType === 'in_person'
                      ? 'Address'
                      : 'Location Details'}
                </Label>
                <Input
                  id="locationValue"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/admin/scheduling/event-types">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || !name || !slug}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
