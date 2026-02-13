'use client'

import { useEffect, useState } from 'react'
import { Button } from '@cgk-platform/ui'

import type { EmailSetupStatus } from '@cgk-platform/communications'
import type { EmailSetupBannerProps } from './types'

/**
 * Email Setup Banner
 *
 * Displayed in admin when email setup is not complete.
 */
export function EmailSetupBanner({ status, onConfigure }: EmailSetupBannerProps) {
  // Don't show if setup is complete
  if (status.complete) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-5 w-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-amber-900">
              {status.skippedAt ? 'Email Setup Skipped' : 'Complete Email Setup'}
            </h4>
            <p className="text-sm text-amber-700">
              {status.skippedAt
                ? 'Email sending is disabled. Configure your email settings to send transactional emails.'
                : 'Configure your email settings to enable sending transactional emails, review requests, and notifications.'}
            </p>
          </div>
        </div>
        <Button onClick={onConfigure}>
          Configure Email
        </Button>
      </div>
    </div>
  )
}

/**
 * Email Setup Banner with auto-fetch
 *
 * Automatically fetches status and displays banner if needed.
 */
export function EmailSetupBannerAuto() {
  const [status, setStatus] = useState<EmailSetupStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/admin/onboarding/email/complete')
        const data = await response.json()
        if (data.status) {
          setStatus(data.status)
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [])

  if (isLoading || !status || status.complete) {
    return null
  }

  const handleConfigure = () => {
    window.location.href = '/admin/settings/email'
  }

  return <EmailSetupBanner status={status} onConfigure={handleConfigure} />
}

export default EmailSetupBanner
