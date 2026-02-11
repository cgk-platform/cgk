'use client'

import { AlertTriangle, Clock, X } from 'lucide-react'
import { useEffect, useState } from 'react'

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
 * Shows warning styling (yellow background) and remaining time.
 * Cannot be dismissed by the impersonated user.
 */
export function ImpersonationBanner({
  impersonationInfo,
}: ImpersonationBannerProps): React.JSX.Element | null {
  const [remainingTime, setRemainingTime] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

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

  if (!impersonationInfo) return null

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b-2 border-yellow-500 bg-yellow-50 px-4 py-2"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-semibold text-yellow-800">
            Impersonation Session Active
          </span>
          <span className="hidden text-yellow-600 sm:inline">-</span>
          <span className="text-sm text-yellow-700">
            Viewed by <strong>{impersonationInfo.impersonatorEmail}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-yellow-700">
          <Clock className="h-4 w-4" />
          <span className={isExpired ? 'font-semibold text-red-600' : ''}>
            {remainingTime}
          </span>
        </div>

        {/* Non-dismissible notice */}
        <div className="hidden items-center gap-1.5 text-xs text-yellow-600 lg:flex">
          <X className="h-3.5 w-3.5" />
          <span>Cannot dismiss</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to extract impersonation info from JWT payload
 *
 * Use this in the admin layout to check if current session is impersonated.
 */
export function useImpersonationInfo(): ImpersonationInfo | null {
  const [info, setInfo] = useState<ImpersonationInfo | null>(null)

  useEffect(() => {
    // This would be populated by the server or from the JWT
    // In a real implementation, this would be passed from the server
    const checkImpersonation = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          if (data.impersonator) {
            setInfo({
              impersonatorEmail: data.impersonator.email,
              expiresAt: data.expiresAt,
              sessionId: data.impersonator.sessionId,
            })
          }
        }
      } catch {
        // Ignore errors
      }
    }

    checkImpersonation()
  }, [])

  return info
}
