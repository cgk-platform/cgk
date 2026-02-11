/**
 * E-Signature Pending Documents Page
 *
 * Displays pending documents organized by category.
 */

import { Card, CardContent, cn } from '@cgk/ui'
import { AlertTriangle, Clock, FileWarning, Timer } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import { DocumentStatusBadge } from '@/components/esign'
import { getPendingDocuments } from '@/lib/esign'
import type { EsignDocumentWithSigners } from '@/lib/esign/types'

export default function PendingDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Pending Documents
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Documents requiring attention
        </p>
      </div>

      <Suspense fallback={<PendingDocumentsSkeleton />}>
        <PendingDocumentsLoader />
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

async function PendingDocumentsLoader() {
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <EmptyState />
  }

  const email = await getCurrentUserEmail()
  const pending = await getPendingDocuments(tenantSlug, email)

  const hasAny =
    pending.awaitingYourSignature.length > 0 ||
    pending.overdue.length > 0 ||
    pending.expiringSoon.length > 0 ||
    pending.stale.length > 0

  if (!hasAny) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8">
      {pending.awaitingYourSignature.length > 0 && (
        <DocumentSection
          title="Awaiting Your Signature"
          description="Documents you need to counter-sign"
          icon={FileWarning}
          iconClass="text-violet-600"
          documents={pending.awaitingYourSignature}
          priority="high"
        />
      )}

      {pending.overdue.length > 0 && (
        <DocumentSection
          title="Overdue"
          description="Past expiration date"
          icon={AlertTriangle}
          iconClass="text-rose-600"
          documents={pending.overdue}
          priority="critical"
        />
      )}

      {pending.expiringSoon.length > 0 && (
        <DocumentSection
          title="Expiring Soon"
          description="Within the next 3 days"
          icon={Timer}
          iconClass="text-amber-600"
          documents={pending.expiringSoon}
          priority="medium"
        />
      )}

      {pending.stale.length > 0 && (
        <DocumentSection
          title="Stale"
          description="No activity in 7+ days"
          icon={Clock}
          iconClass="text-slate-500"
          documents={pending.stale}
          priority="low"
        />
      )}
    </div>
  )
}

function DocumentSection({
  title,
  description,
  icon: Icon,
  iconClass,
  documents,
  priority,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  documents: EsignDocumentWithSigners[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}) {
  const borderClass = {
    critical: 'border-l-rose-500',
    high: 'border-l-violet-500',
    medium: 'border-l-amber-500',
    low: 'border-l-slate-400',
  }[priority]

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('rounded-lg bg-slate-100 p-2 dark:bg-slate-800', iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {documents.length}
        </span>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <Link key={doc.id} href={`/admin/esign/documents/${doc.id}`}>
            <Card className={cn('border-l-4 transition-all hover:shadow-sm', borderClass)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {doc.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {doc.signers.length === 1
                      ? doc.signers[0].name
                      : `${doc.signers.length} signers`}
                    {doc.templateName && ` - ${doc.templateName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DocumentStatusBadge status={doc.status} />
                  {doc.expiresAt && (
                    <span className="text-sm text-slate-500">
                      {formatRelativeDate(doc.expiresAt)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex h-48 items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
            All caught up!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No pending documents require your attention
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function PendingDocumentsSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-1.5">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatRelativeDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`
  }
  if (diffDays === 0) {
    return 'Expires today'
  }
  if (diffDays === 1) {
    return 'Expires tomorrow'
  }
  return `Expires in ${diffDays}d`
}
