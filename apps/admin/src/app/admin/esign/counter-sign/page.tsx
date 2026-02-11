/**
 * E-Signature Counter-Sign Queue Page
 *
 * Displays documents awaiting internal signature.
 */

import { headers } from 'next/headers'
import { Suspense } from 'react'
import { CounterSignQueue, CounterSignQueueSkeleton } from '@/components/esign'
import { getCounterSignQueue } from '@/lib/esign'

export default function CounterSignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Counter-Sign Queue
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Documents waiting for your signature
        </p>
      </div>

      <Suspense fallback={<CounterSignQueueSkeleton />}>
        <CounterSignQueueLoader />
      </Suspense>
    </div>
  )
}

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function getCurrentUserEmail(): Promise<string> {
  const headersList = await headers()
  return headersList.get('x-user-email') || 'admin@example.com'
}

async function CounterSignQueueLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <CounterSignQueue documents={[]} />
  }

  const email = await getCurrentUserEmail()
  const documents = await getCounterSignQueue(tenantSlug, email)

  return <CounterSignQueue documents={documents} />
}
