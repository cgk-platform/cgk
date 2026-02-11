'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

/**
 * Super Admin Login Page
 *
 * Password-based authentication for super admins.
 * After successful login, redirects to MFA challenge if enabled.
 */
export default function LoginPage() {
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

      if (data.mfaRequired) {
        // Redirect to MFA challenge
        router.push(`/mfa-challenge?redirect=${encodeURIComponent(redirect)}`)
      } else {
        // Redirect to original destination
        router.push(redirect)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Orchestrator</h1>
          <p className="text-muted-foreground mt-2">Super Admin Login</p>
        </div>

        {reason === 'session_expired' && (
          <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
            Your session has expired. Please log in again.
          </div>
        )}

        {reason === 'invalid_token' && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            Invalid session. Please log in again.
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@example.com"
              required
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>This portal is for authorized super administrators only.</p>
          <p className="mt-1">All access is logged and monitored.</p>
        </div>
      </div>
    </div>
  )
}
