'use client'

import { cn } from '@cgk/ui'
import { useCallback, useEffect, useState } from 'react'

import type { WelcomeCallData } from '../../../lib/onboarding-wizard/types'

/** Time slot from scheduling API */
interface WelcomeCallSlot {
  start: string
  end: string
  hostId: string
  hostName: string
  eventTypeId: string
}

interface WelcomeCallStepProps {
  data: WelcomeCallData
  errors: Record<string, string>
  onChange: (data: WelcomeCallData) => void
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
]

/**
 * Welcome Call Scheduling Step
 *
 * Optional step to schedule an introductory call with the team.
 */
export function WelcomeCallStep({
  data,
  errors: _errors,
  onChange,
}: WelcomeCallStepProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<WelcomeCallSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<WelcomeCallSlot | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isBooking, setIsBooking] = useState(false)

  // Generate next 5 weekdays
  const availableDates = getNextWeekdays(5)

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate) return

    async function loadSlots(): Promise<void> {
      setIsLoadingSlots(true)
      setAvailableSlots([])
      setSelectedSlot(null)

      try {
        const response = await fetch(
          `/api/creator/scheduling/welcome-call?date=${selectedDate}&timezone=${data.timezone}`
        )

        if (response.ok) {
          const result = await response.json()
          setAvailableSlots(result.slots || [])
        }
      } catch (error) {
        console.error('Failed to load slots:', error)
      } finally {
        setIsLoadingSlots(false)
      }
    }

    loadSlots()
  }, [selectedDate, data.timezone])

  const handleTimezoneChange = useCallback(
    (timezone: string) => {
      onChange({ ...data, timezone })
    },
    [data, onChange]
  )

  const handleBookCall = useCallback(async () => {
    if (!selectedSlot) return

    setIsBooking(true)

    try {
      const response = await fetch('/api/creator/scheduling/welcome-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotStart: selectedSlot.start,
          hostId: selectedSlot.hostId,
          eventTypeId: selectedSlot.eventTypeId,
          timezone: data.timezone,
          invitee: {
            name: 'Creator', // Would come from auth context
            email: 'creator@example.com', // Would come from auth context
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        onChange({
          ...data,
          scheduled: true,
          skipped: false,
          bookingId: result.bookingId,
          scheduledTime: selectedSlot.start,
        })
      }
    } catch (error) {
      console.error('Failed to book call:', error)
    } finally {
      setIsBooking(false)
    }
  }, [selectedSlot, data, onChange])

  const handleSkip = useCallback(() => {
    onChange({
      ...data,
      skipped: true,
      scheduled: false,
    })
  }, [data, onChange])

  // Already scheduled
  if (data.scheduled && data.scheduledTime) {
    const scheduledDate = new Date(data.scheduledTime)

    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-wizard-success/30 bg-wizard-success/5 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wizard-success/10">
            <CheckIcon className="h-8 w-8 text-wizard-success" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-medium text-wizard-text">
            Welcome Call Scheduled!
          </h3>
          <p className="mt-2 text-wizard-muted">
            We look forward to meeting you
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
            <CalendarIcon className="h-5 w-5 text-wizard-accent" />
            <div className="text-left">
              <p className="font-medium text-wizard-text">
                {scheduledDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-wizard-muted">
                {scheduledDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
            </div>
          </div>

          <p className="mt-6 text-sm text-wizard-muted">
            A calendar invite has been sent to your email
          </p>
        </div>
      </div>
    )
  }

  // Already skipped
  if (data.skipped) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-wizard-border bg-white p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-wizard-hover">
            <CalendarIcon className="h-8 w-8 text-wizard-muted" />
          </div>
          <h3 className="mt-4 font-serif text-xl font-medium text-wizard-text">
            Welcome Call Skipped
          </h3>
          <p className="mt-2 text-wizard-muted">
            No worries! You can schedule a call anytime from your dashboard.
          </p>

          <button
            type="button"
            onClick={() => onChange({ ...data, skipped: false })}
            className="mt-6 text-sm font-medium text-wizard-accent hover:underline"
          >
            Actually, I&apos;d like to schedule a call
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="rounded-lg bg-wizard-hover p-4">
        <div className="flex gap-3">
          <VideoIcon className="h-5 w-5 shrink-0 text-wizard-accent" />
          <div>
            <p className="text-sm font-medium text-wizard-text">
              Meet the team (optional)
            </p>
            <p className="mt-1 text-sm text-wizard-muted">
              Schedule a 15-minute welcome call to learn about the program,
              ask questions, and get personalized guidance for success.
            </p>
          </div>
        </div>
      </div>

      {/* Timezone selector */}
      <div>
        <label className="text-sm font-medium text-wizard-text">
          Your Timezone
        </label>
        <select
          value={data.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="mt-2 w-full rounded-lg border border-wizard-border bg-white px-4 py-2.5 text-wizard-text focus:border-wizard-accent focus:outline-none focus:ring-2 focus:ring-wizard-accent/20"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date selection */}
      <div>
        <label className="text-sm font-medium text-wizard-text">
          Select a Date
        </label>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {availableDates.map((date) => {
            const isSelected = selectedDate === date.value
            const dayName = date.date.toLocaleDateString('en-US', { weekday: 'short' })
            const dayNum = date.date.getDate()
            const monthName = date.date.toLocaleDateString('en-US', { month: 'short' })

            return (
              <button
                key={date.value}
                type="button"
                onClick={() => setSelectedDate(date.value)}
                className={cn(
                  'rounded-lg border p-3 text-center transition-all',
                  isSelected
                    ? 'border-wizard-accent bg-wizard-accent text-white'
                    : 'border-wizard-border bg-white hover:border-wizard-accent/50'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-medium',
                    isSelected ? 'text-white/80' : 'text-wizard-muted'
                  )}
                >
                  {dayName}
                </p>
                <p
                  className={cn(
                    'text-xl font-medium',
                    isSelected ? 'text-white' : 'text-wizard-text'
                  )}
                >
                  {dayNum}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isSelected ? 'text-white/80' : 'text-wizard-muted'
                  )}
                >
                  {monthName}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slot selection */}
      {selectedDate && (
        <div>
          <label className="text-sm font-medium text-wizard-text">
            Available Times
          </label>

          {isLoadingSlots ? (
            <div className="mt-3 flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-sm text-wizard-muted">Loading available times...</span>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="mt-3 rounded-lg border border-wizard-border bg-white p-6 text-center">
              <p className="text-wizard-muted">No available times on this date.</p>
              <p className="mt-1 text-sm text-wizard-muted">Please select another date.</p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start
                const time = new Date(slot.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })

                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-center transition-all',
                      isSelected
                        ? 'border-wizard-accent bg-wizard-accent/5 text-wizard-accent ring-2 ring-wizard-accent/20'
                        : 'border-wizard-border bg-white text-wizard-text hover:border-wizard-accent/50'
                    )}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected slot summary */}
      {selectedSlot && (
        <div className="rounded-lg border border-wizard-accent/30 bg-wizard-accent/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-wizard-text">
                {new Date(selectedSlot.start).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-wizard-muted">
                {new Date(selectedSlot.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                with {selectedSlot.hostName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBookCall}
              disabled={isBooking}
              className="rounded-lg bg-wizard-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-wizard-accent-hover disabled:opacity-50"
            >
              {isBooking ? (
                <>
                  <LoadingSpinner className="inline h-4 w-4 mr-2" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Skip option */}
      <div className="border-t border-wizard-border pt-6 text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-wizard-muted hover:text-wizard-text"
        >
          Skip for now - I&apos;ll schedule later
        </button>
      </div>
    </div>
  )
}

// Helper function to get next N weekdays
function getNextWeekdays(count: number): Array<{ value: string; date: Date }> {
  const dates: Array<{ value: string; date: Date }> = []
  const today = new Date()
  let current = new Date(today)

  while (dates.length < count) {
    current.setDate(current.getDate() + 1)
    const dayOfWeek = current.getDay()

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateValue = current.toISOString().split('T')[0]
      dates.push({
        value: dateValue || '',
        date: new Date(current),
      })
    }
  }

  return dates
}

function VideoIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LoadingSpinner({ className = 'h-5 w-5' }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('animate-spin rounded-full border-2 border-wizard-muted/30 border-t-wizard-muted', className)} />
  )
}
