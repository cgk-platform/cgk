'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const redirect = searchParams.get('redirect') || '/'
  const reason = searchParams.get('reason')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      router.push(redirect)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {reason === 'session_expired' && (
        <div className="rounded bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
          Your session has expired. Please log in again.
        </div>
      )}

      {reason === 'invalid_token' && (
        <div className="rounded bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          Invalid session. Please log in again.
        </div>
      )}

      {error && (
        <div className="rounded bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="admin@example.com"
            required
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </>
  )
}

export function LoginFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="mb-2 h-4 w-12 rounded bg-muted" />
        <div className="h-10 rounded bg-muted" />
      </div>
      <div>
        <div className="mb-2 h-4 w-16 rounded bg-muted" />
        <div className="h-10 rounded bg-muted" />
      </div>
      <div className="h-10 rounded bg-muted" />
    </div>
  )
}
