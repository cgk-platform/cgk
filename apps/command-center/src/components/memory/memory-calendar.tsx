'use client'

import { cn } from '@cgk-platform/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'

interface MemoryCalendarProps {
  availableDates: Set<string>
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatMonth(year: number, month: number): string {
  return new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function MemoryCalendar({ availableDates, selectedDate, onSelectDate }: MemoryCalendarProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay = firstDayOfMonth(viewYear, viewMonth)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{formatMonth(viewYear, viewMonth)}</span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const dateStr = toDateStr(viewYear, viewMonth, day)
          const hasData = availableDates.has(dateStr)
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === toDateStr(now.getFullYear(), now.getMonth(), now.getDate())

          return (
            <button
              key={day}
              onClick={() => hasData && onSelectDate(dateStr)}
              disabled={!hasData}
              className={cn(
                'rounded p-1 text-center text-xs transition-colors',
                hasData && !isSelected && 'cursor-pointer text-foreground hover:bg-accent',
                hasData && 'font-medium',
                !hasData && 'cursor-default text-muted-foreground/30',
                isSelected && 'bg-primary text-primary-foreground',
                isToday && !isSelected && hasData && 'ring-1 ring-gold',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
