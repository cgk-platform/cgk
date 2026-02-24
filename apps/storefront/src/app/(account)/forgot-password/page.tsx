/**
 * Forgot Password Page
 *
 * Allows customers to request a password reset email.
 */

'use client'

import { useState, type FormEvent } from 'react'

import Link from 'next/link'
import { Loader2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      const response = await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Forgot your password?</h1>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">Check your email</h3>
              <p className="mt-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
                If an account exists with that email, we&apos;ve sent a reset link.
                Please check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[hsl(var(--portal-primary))] px-6 py-3 font-medium text-white transition-all hover:bg-[hsl(var(--portal-primary))]/90"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {status === 'error' && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  Something went wrong. Please try again.
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                >
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-medium text-[hsl(var(--portal-primary))] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
