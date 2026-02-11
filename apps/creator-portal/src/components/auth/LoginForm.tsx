'use client'

import { Button, Input, Label } from '@cgk/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'


export function LoginForm(): React.JSX.Element {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/creator/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remember"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
          disabled={isLoading}
        />
        <label htmlFor="remember" className="text-sm text-muted-foreground">
          Remember me
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <MagicLinkButton email={email} disabled={isLoading} />
    </form>
  )
}

function MagicLinkButton({
  email,
  disabled,
}: {
  email: string
  disabled: boolean
}): React.JSX.Element {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/creator/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok && response.status !== 429) {
        throw new Error(data.error || 'Failed to send magic link')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-center text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">
        Check your email for a sign-in link
      </div>
    )
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-center text-xs text-destructive">{error}</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleSendMagicLink}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Sending...' : 'Send magic link'}
      </Button>
    </div>
  )
}
