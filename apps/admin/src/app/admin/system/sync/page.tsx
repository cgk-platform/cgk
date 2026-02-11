/**
 * System Sync & Maintenance Page
 * Data synchronization and consistency tools
 */

import { Suspense } from 'react'

import { SyncClient } from './sync-client'

export default function SystemSyncPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <svg
                className="h-6 w-6 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                System Sync
              </h1>
              <p className="text-sm text-zinc-400">
                Data synchronization and maintenance operations
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <Suspense fallback={<SyncSkeleton />}>
        <SyncClient />
      </Suspense>
    </div>
  )
}

function SyncSkeleton() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-zinc-900"
          />
        ))}
      </div>
    </main>
  )
}
