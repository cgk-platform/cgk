/**
 * E-Signature Recent Documents Table
 *
 * Displays recent documents with status and signer info.
 */

'use client'

import { Card, CardContent, cn } from '@cgk/ui'
import { ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { DocumentStatusBadge } from './document-status-badge'
import type { EsignDocumentWithSigners } from '@/lib/esign/types'

interface RecentDocumentsProps {
  documents: EsignDocumentWithSigners[]
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No recent documents
            </p>
            <Link
              href="/admin/esign/documents/new"
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Create your first document
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Recent Documents
        </h3>
        <Link
          href="/admin/esign/documents"
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            'text-slate-600 hover:text-slate-900',
            'dark:text-slate-400 dark:hover:text-slate-100',
            'transition-colors'
          )}
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/admin/esign/documents/${doc.id}`}
            className={cn(
              'flex items-center justify-between px-5 py-4',
              'transition-colors duration-150',
              'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {doc.name}
                </p>
                <DocumentStatusBadge status={doc.status} />
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {doc.signers.length === 1
                    ? doc.signers[0].name
                    : `${doc.signers.length} signers`}
                </span>
                {doc.templateName && (
                  <span className="truncate">
                    Template: {doc.templateName}
                  </span>
                )}
              </div>
            </div>

            <div className="ml-4 flex shrink-0 items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(doc.createdAt)}
                </p>
                {doc.expiresAt && new Date(doc.expiresAt) > new Date() && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Expires {formatRelativeTime(doc.expiresAt)}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}

export function RecentDocumentsSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
