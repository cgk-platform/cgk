'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

import type { AttributionModel, AttributionWindow, TimeRangePreset } from '@/lib/attribution'

interface AttributionContextValue {
  model: AttributionModel
  setModel: (model: AttributionModel) => void
  window: AttributionWindow
  setWindow: (window: AttributionWindow) => void
  timeRangePreset: TimeRangePreset
  setTimeRangePreset: (preset: TimeRangePreset) => void
  startDate: string
  endDate: string
  setDateRange: (start: string, end: string) => void
  isRealtime: boolean
  setIsRealtime: (realtime: boolean) => void
}

const AttributionContext = createContext<AttributionContextValue | null>(null)

function getDateFromPreset(preset: TimeRangePreset): { start: string; end: string } {
  const end = new Date()
  const start = new Date()

  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '14d':
      start.setDate(start.getDate() - 14)
      break
    case '28d':
      start.setDate(start.getDate() - 28)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    default:
      start.setDate(start.getDate() - 7)
  }

  const startParts = start.toISOString().split('T')
  const endParts = end.toISOString().split('T')
  return {
    start: startParts[0] ?? '',
    end: endParts[0] ?? '',
  }
}

interface AttributionProviderProps {
  children: ReactNode
  initialModel?: AttributionModel
  initialWindow?: AttributionWindow
  initialTimeRange?: TimeRangePreset
}

export function AttributionProvider({
  children,
  initialModel = 'time_decay',
  initialWindow = '7d',
  initialTimeRange = '7d',
}: AttributionProviderProps) {
  const [model, setModel] = useState<AttributionModel>(initialModel)
  const [window, setWindow] = useState<AttributionWindow>(initialWindow)
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>(initialTimeRange)
  const [isRealtime, setIsRealtime] = useState(false)

  const initialDates = getDateFromPreset(initialTimeRange)
  const [startDate, setStartDate] = useState(initialDates.start)
  const [endDate, setEndDate] = useState(initialDates.end)

  const handleTimeRangeChange = useCallback((preset: TimeRangePreset) => {
    setTimeRangePreset(preset)
    if (preset !== 'custom') {
      const dates = getDateFromPreset(preset)
      setStartDate(dates.start)
      setEndDate(dates.end)
    }
  }, [])

  const setDateRange = useCallback((start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    setTimeRangePreset('custom')
  }, [])

  return (
    <AttributionContext.Provider
      value={{
        model,
        setModel,
        window,
        setWindow,
        timeRangePreset,
        setTimeRangePreset: handleTimeRangeChange,
        startDate,
        endDate,
        setDateRange,
        isRealtime,
        setIsRealtime,
      }}
    >
      {children}
    </AttributionContext.Provider>
  )
}

export function useAttribution() {
  const context = useContext(AttributionContext)
  if (!context) {
    throw new Error('useAttribution must be used within an AttributionProvider')
  }
  return context
}
