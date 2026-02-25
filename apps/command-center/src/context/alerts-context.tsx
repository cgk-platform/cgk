'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface Alert {
  id: string
  level: 'info' | 'warning' | 'critical'
  message: string
  source?: string
  timestamp: number
}

interface AlertsContextValue {
  alerts: Alert[]
  unreadCount: number
  pushAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void
  clearAlerts: () => void
  dismissAlert: (id: string) => void
}

const AlertsContext = createContext<AlertsContextValue | null>(null)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const pushAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    }
    setAlerts((prev) => {
      // Deduplicate by message within last 60 seconds
      const recent = prev.filter(
        (a) => a.message === newAlert.message && Date.now() - a.timestamp < 60_000
      )
      if (recent.length > 0) return prev
      // Keep last 50 alerts
      return [...prev.slice(-49), newAlert]
    })
  }, [])

  const clearAlerts = useCallback(() => setAlerts([]), [])

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const unreadCount = useMemo(() => alerts.length, [alerts])

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, pushAlert, clearAlerts, dismissAlert }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}
