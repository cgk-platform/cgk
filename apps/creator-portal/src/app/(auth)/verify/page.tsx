'use client'

import { useEffect, useState, Suspense } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      setErrorMessage('Invalid verification link. Please request a new one.')
      setStatus('error')
      return
    }

    async function verify() {
      try {
        const response = await fetch('/api/creator/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrorMessage(data.error || 'Verification failed')
          setStatus('error')
          return
        }

        setStatus('success')

        // Redirect to dashboard (or onboarding if not completed)
        setTimeout(() => {
          if (data.creator?.onboardingCompleted === false) {
            router.push('/onboarding')
          } else {
            router.push('/dashboard')
          }
          router.refresh()
        }, 1500)
      } catch {
        setErrorMessage('Something went wrong. Please try again.')
        setStatus('error')
      }
    }

    verify()
  }, [searchParams, router])

  if (status === 'verifying') {
    return (
      <div className="text-center py-8">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <h2 className="mt-4 text-lg font-semibold">Verifying your link...</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please wait a moment.</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
        <h2 className="mt-4 text-lg font-semibold">Verified!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="text-center py-8">
      <XCircle className="mx-auto h-8 w-8 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">Verification failed</h2>
      <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      <a
        href="/login"
        className="mt-4 inline-block text-sm text-primary hover:underline"
      >
        Back to sign in
      </a>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
