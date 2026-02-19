'use client'

import { useState, type FormEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Invalid email or password')
        setStatus('error')
        return
      }

      router.push('/account')
      router.refresh()
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Sign in to your account
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === 'error' && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
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

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                >
                  Password
                </label>
                <Link
                  href="/account/forgot-password"
                  className="text-sm text-[hsl(var(--portal-primary))] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
            Don&apos;t have an account?{' '}
            <Link
              href="/account/register"
              className="font-medium text-[hsl(var(--portal-primary))] hover:underline"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
