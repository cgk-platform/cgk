'use client'

import { AlertTriangle, Clock, LogOut, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ImpersonationInfo {
  impersonatorEmail: string
  expiresAt: string
  sessionId: string
}

interface ImpersonationBannerProps {
  impersonationInfo: ImpersonationInfo | null
}

/**
 * Banner displayed when the current session is being impersonated
 *
 * Shows warning styling (yellow background), remaining time, and an "End Session" button.
 * Allows exiting the impersonation session.
 */
export function ImpersonationBanner({
  impersonationInfo,
}: ImpersonationBannerProps): React.JSX.Element | null {
  const router = useRouter()
  const [remainingTime, setRemainingTime] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (!impersonationInfo) return

    const updateRemainingTime = () => {
      const expiresAt = new Date(impersonationInfo.expiresAt).getTime()
      const now = Date.now()
      const remaining = expiresAt - now

      if (remaining <= 0) {
        setIsExpired(true)
        setRemainingTime('Expired')
        return
      }

      const minutes = Math.ceil(remaining / 60000)
      if (minutes >= 60) {
        setRemainingTime('~1 hour')
      } else if (minutes > 1) {
        setRemainingTime(`${minutes} minutes`)
      } else {
        setRemainingTime('< 1 minute')
      }
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 30000)

    return () => clearInterval(interval)
  }, [impersonationInfo])

  const handleEndSession = useCallback(async () => {
    if (isEnding) return

    setIsEnding(true)
    try {
      const response = await fetch('/api/auth/impersonation/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to login page (or wherever specified)
        router.push(data.redirectTo || '/login')
      } else {
        console.error('Failed to end impersonation session')
        setIsEnding(false)
      }
    } catch (error) {
      console.error('Error ending impersonation:', error)
      setIsEnding(false)
    }
  }, [isEnding, router])

  if (!impersonationInfo) return null

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b-2 border-warning bg-warning/10 px-4 py-2"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-semibold text-warning">
            Impersonation Session Active
          </span>
          <span className="hidden text-warning/70 sm:inline">-</span>
          <span className="text-sm text-warning/90">
            You are being viewed by <strong>{impersonationInfo.impersonatorEmail}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-sm text-warning/80 sm:flex">
          <Clock className="h-4 w-4" />
          <span className={isExpired ? 'font-semibold text-destructive' : ''}>
            {remainingTime}
          </span>
        </div>

        {/* End Session Button */}
        <button
          onClick={handleEndSession}
          disabled={isEnding}
          className="inline-flex items-center gap-1.5 rounded-md bg-warning/20 px-3 py-1.5 text-sm font-medium text-warning transition-colors duration-fast hover:bg-warning/30 focus:outline-none focus:ring-2 focus:ring-warning/50 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="End impersonation session"
        >
          {isEnding ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Ending...</span>
            </>
          ) : (
            <>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">End Session</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
