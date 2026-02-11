/**
 * Changelog / Audit Trail Page
 * View system change history
 */

import { Suspense } from 'react'

import { ChangelogClient } from './changelog-client'

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <svg
                className="h-6 w-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Changelog
              </h1>
              <p className="text-sm text-neutral-500">
                System audit trail and change history
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <Suspense fallback={<ChangelogSkeleton />}>
        <ChangelogClient />
      </Suspense>
    </div>
  )
}

function ChangelogSkeleton() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-neutral-200"
            />
          ))}
        </div>
      </div>
    </main>
  )
}
