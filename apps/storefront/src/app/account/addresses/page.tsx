/**
 * Addresses Page
 *
 * Address book management with add, edit, delete operations.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'


import { getAddresses } from '@/lib/account/api'
import { defaultContent, getContent } from '@/lib/account/content'

import { AddressesClient, AddressesListSkeleton } from './components'

export const metadata: Metadata = {
  title: 'Address Book',
  description: 'Manage your shipping addresses',
}

export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-2xl font-bold tracking-tight lg:text-3xl"
            style={{ fontFamily: 'var(--portal-heading-font)' }}
          >
            {getContent(defaultContent, 'addresses.title')}
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
          Manage your shipping addresses for faster checkout
        </p>
      </div>

      {/* Addresses List */}
      <Suspense fallback={<AddressesListSkeleton />}>
        <AddressesList />
      </Suspense>
    </div>
  )
}

async function AddressesList() {
  const addresses = await getAddresses()

  return <AddressesClient addresses={addresses} content={defaultContent} />
}
