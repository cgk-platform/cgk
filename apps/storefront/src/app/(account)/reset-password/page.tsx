/**
 * Reset Password Page
 *
 * Allows customers to set a new password using a reset token.
 */

'use client'

import { useState, type FormEvent, Suspense } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, Lock, CheckCircle } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!token || !email) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-600">Invalid Reset Link</h3>
        <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
          This password reset link is invalid or has expired.
          Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
        >
          Request New Link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters')
      setStatus('error')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      setStatus('error')
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Password reset failed. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800">Password Reset Successful</h3>
        <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === 'error' && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
        >
          New Password
        </label>
        <div className="relative mt-1.5">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
          <input
            type="password"
            id="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
        >
          Confirm New Password
        </label>
        <div className="relative mt-1.5">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
          <input
            type="password"
            id="confirmPassword"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Resetting...
          </>
        ) : (
          'Reset Password'
        )}
      </button>
    </form>
  )
}

function ResetPasswordFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--portal-primary))]/20 border-t-[hsl(var(--portal-primary))]" />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Enter your new password below.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-8">
          <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
