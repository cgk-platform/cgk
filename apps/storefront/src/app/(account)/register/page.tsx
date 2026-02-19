'use client'

import { useState, type FormEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match')
      setStatus('error')
      return
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters')
      setStatus('error')
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Registration failed')
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

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-12" style={{ maxWidth: 'var(--portal-max-width)' }}>
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-[hsl(var(--portal-muted-foreground))]">
            Join us to track orders, save favorites, and more
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === 'error' && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                >
                  First name
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
                >
                  Last name
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

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
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="block w-full rounded-lg border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-background))] py-2.5 pl-10 pr-4 text-[hsl(var(--portal-foreground))] placeholder-[hsl(var(--portal-muted-foreground))] focus:border-[hsl(var(--portal-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]/20"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[hsl(var(--portal-foreground))]"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                <input
                  type="password"
                  id="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
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
                Confirm password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]" />
                <input
                  type="password"
                  id="confirmPassword"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
            Already have an account?{' '}
            <Link
              href="/account/login"
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
