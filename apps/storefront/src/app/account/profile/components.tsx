/**
 * Profile Page Components
 *
 * Client components for profile settings form.
 */

'use client'

import { Alert, AlertDescription, Button, cn, Input, Label, Switch } from '@cgk-platform/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { requestPasswordReset, updateProfile } from '@/lib/account/api'
import { getContent } from '@/lib/account/content'
import type { CustomerProfile, PortalContentStrings } from '@/lib/account/types'

interface ProfileFormProps {
  profile: CustomerProfile
  content: PortalContentStrings
}

export function ProfileForm({ profile, content }: ProfileFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingPassword, setIsRequestingPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordResetSent, setPasswordResetSent] = useState(false)

  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || '',
    acceptsMarketing: profile.acceptsMarketing,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        acceptsMarketing: formData.acceptsMarketing,
      })
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    setIsRequestingPassword(true)
    try {
      await requestPasswordReset()
      setPasswordResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset')
    } finally {
      setIsRequestingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Success Alert */}
      {success && (
        <Alert
          variant="success"
          className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <AlertDescription>
            {getContent(content, 'profile.save_success')}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information Section */}
        <section
          className={cn(
            'rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-6'
          )}
        >
          <h2
            className="mb-6 text-lg font-semibold"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            Personal Information
          </h2>

          <div className="space-y-5">
            {/* Name Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">{getContent(content, 'profile.first_name')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="mt-1.5 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="lastName">{getContent(content, 'profile.last_name')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="mt-1.5 rounded-lg"
                />
              </div>
            </div>

            {/* Email - Read Only */}
            <div>
              <Label htmlFor="email">{getContent(content, 'profile.email')}</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="mt-1.5 rounded-lg bg-[hsl(var(--portal-muted))]/50 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs text-[hsl(var(--portal-muted-foreground))]">
                {getContent(content, 'profile.email_note')}
              </p>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">{getContent(content, 'profile.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="mt-1.5 rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Marketing Preferences Section */}
        <section
          className={cn(
            'rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-6'
          )}
        >
          <h2
            className="mb-6 text-lg font-semibold"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(content, 'profile.marketing')}
          </h2>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">Email Communications</p>
              <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                {getContent(content, 'profile.marketing_description')}
              </p>
            </div>
            <Switch
              checked={formData.acceptsMarketing}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, acceptsMarketing: checked })
              }
            />
          </div>
        </section>

        {/* Password Section */}
        <section
          className={cn(
            'rounded-xl border border-[hsl(var(--portal-border))]',
            'bg-[hsl(var(--portal-card))] p-6'
          )}
        >
          <h2
            className="mb-6 text-lg font-semibold"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(content, 'profile.password')}
          </h2>

          <p className="mb-4 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {getContent(content, 'profile.password_description')}
          </p>

          {passwordResetSent ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Password reset instructions have been sent to {profile.email}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isRequestingPassword}
              className="rounded-lg"
            >
              {isRequestingPassword ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  {getContent(content, 'profile.change_password')}
                </>
              )}
            </Button>
          )}
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[hsl(var(--portal-primary))] px-8 hover:bg-[hsl(var(--portal-primary))]/90"
          >
            {isSubmitting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              getContent(content, 'profile.save')
            )}
          </Button>
        </div>
      </form>

      {/* Account Info */}
      <div className="mt-8 text-center text-xs text-[hsl(var(--portal-muted-foreground))]">
        <p>
          Member since{' '}
          {new Date(profile.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}

export function ProfileFormSkeleton() {
  return (
    <div className="max-w-2xl space-y-8">
      {/* Personal Information Section */}
      <section className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
        <div className="mb-6 h-6 w-40 rounded bg-[hsl(var(--portal-muted))]" />
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="mt-1.5 h-9 rounded-lg bg-[hsl(var(--portal-muted))]" />
            </div>
            <div>
              <div className="h-4 w-20 rounded bg-[hsl(var(--portal-muted))]" />
              <div className="mt-1.5 h-9 rounded-lg bg-[hsl(var(--portal-muted))]" />
            </div>
          </div>
          <div>
            <div className="h-4 w-16 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-1.5 h-9 rounded-lg bg-[hsl(var(--portal-muted))]" />
          </div>
          <div>
            <div className="h-4 w-24 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="mt-1.5 h-9 rounded-lg bg-[hsl(var(--portal-muted))]" />
          </div>
        </div>
      </section>

      {/* Marketing Section */}
      <section className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
        <div className="mb-6 h-6 w-48 rounded bg-[hsl(var(--portal-muted))]" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-[hsl(var(--portal-muted))]" />
            <div className="h-4 w-64 rounded bg-[hsl(var(--portal-muted))]" />
          </div>
          <div className="h-6 w-10 rounded-full bg-[hsl(var(--portal-muted))]" />
        </div>
      </section>

      {/* Password Section */}
      <section className="animate-pulse rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] p-6">
        <div className="mb-6 h-6 w-24 rounded bg-[hsl(var(--portal-muted))]" />
        <div className="mb-4 h-4 w-80 rounded bg-[hsl(var(--portal-muted))]" />
        <div className="h-9 w-40 rounded-lg bg-[hsl(var(--portal-muted))]" />
      </section>

      <div className="flex justify-end">
        <div className="h-10 w-32 rounded-lg bg-[hsl(var(--portal-muted))]" />
      </div>
    </div>
  )
}
