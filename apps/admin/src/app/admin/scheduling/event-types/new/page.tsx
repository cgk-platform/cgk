'use client'

import { Button, Card, CardContent, CardHeader, Input, Label, Textarea, Select, SelectOption } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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

export default function NewEventTypePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [color, setColor] = useState('blue')
  const [locationType, setLocationType] = useState('google_meet')
  const [locationValue, setLocationValue] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)
    setSlug(generatedSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/scheduling/event-types', {
        method: 'POST',
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
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create event type')
      }

      router.push('/admin/scheduling/event-types')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/scheduling/event-types"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">New Event Type</h1>
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

            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
              <p className="text-xs text-muted-foreground">
                This will be used in your booking URL
              </p>
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
                  placeholder={
                    locationType === 'phone'
                      ? '+1 (555) 123-4567'
                      : locationType === 'in_person'
                        ? '123 Main St, City, State'
                        : 'Enter location details...'
                  }
                />
              </div>
            )}

            {locationType === 'google_meet' && (
              <p className="text-sm text-muted-foreground">
                A Google Meet link will be automatically generated for each booking.
              </p>
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
            {isSubmitting ? 'Creating...' : 'Create Event Type'}
          </Button>
        </div>
      </form>
    </div>
  )
}
