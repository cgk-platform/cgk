/**
 * Profile Settings Page
 *
 * Allows customers to update their account information.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { ProfileForm, ProfileFormSkeleton } from './components'

import { getProfile } from '@/lib/account/api'
import { defaultContent, getContent } from '@/lib/account/content'

export const metadata: Metadata = {
  title: 'Profile Settings',
  description: 'Manage your account information',
}

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(defaultContent, 'profile.title')}
          </h1>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm text-[hsl(var(--portal-muted-foreground))] transition-colors hover:text-[hsl(var(--portal-foreground))]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Account
          </Link>
        </div>
        <p className="text-[hsl(var(--portal-muted-foreground))]">
          {getContent(defaultContent, 'profile.description')}
        </p>
      </div>

      {/* Profile Form */}
      <Suspense fallback={<ProfileFormSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  )
}

async function ProfileContent() {
  const profile = await getProfile()

  return <ProfileForm profile={profile} content={defaultContent} />
}
