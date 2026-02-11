/**
 * E-Signature Counter-Sign Queue
 *
 * Displays documents awaiting internal signature.
 */

'use client'

import { Button, Card, CardContent, cn } from '@cgk/ui'
import { Check, Clock, FileSignature, User } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { EsignDocumentWithSigners } from '@/lib/esign/types'

interface CounterSignQueueProps {
  documents: EsignDocumentWithSigners[]
}

export function CounterSignQueue({ documents }: CounterSignQueueProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <div className="text-center">
            <FileSignature className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No documents awaiting your signature
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Counter-Sign Queue
        </h2>
        <span className="text-sm text-slate-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''} waiting
        </span>
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <CounterSignCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  )
}

function CounterSignCard({ document }: { document: EsignDocumentWithSigners }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Find the creator signer who already signed
  const creatorSigner = document.signers.find(
    (s) => !s.isInternal && s.status === 'signed'
  )

  // Find the internal signer (counter-signer)
  const counterSigner = document.signers.find(
    (s) => s.isInternal && s.status === 'pending'
  )

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/20'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              {document.name}
            </h3>

            {creatorSigner && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>
                  Signed by {creatorSigner.name}
                  {creatorSigner.signedAt && (
                    <span className="ml-1 text-slate-400">
                      on{' '}
                      {new Date(creatorSigner.signedAt).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span>Your turn to sign</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/admin/esign/documents/${document.id}?action=counter-sign`}>
              <Button className="gap-1.5">
                <FileSignature className="h-4 w-4" />
                Sign Now
              </Button>
            </Link>
          </div>
        </div>

        {/* Expandable signer details */}
        {document.signers.length > 1 && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {isExpanded ? 'Hide' : 'Show'} all signers (
              {document.signers.length})
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2">
                {document.signers.map((signer, idx) => (
                  <div
                    key={signer.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium dark:bg-slate-800">
                      {idx + 1}
                    </span>
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="flex-1">{signer.name}</span>
                    <span
                      className={cn(
                        'text-xs',
                        signer.status === 'signed'
                          ? 'text-emerald-600'
                          : signer.status === 'pending'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                      )}
                    >
                      {signer.status === 'signed'
                        ? 'Signed'
                        : signer.status === 'pending'
                          ? signer.isInternal
                            ? 'Awaiting your signature'
                            : 'Pending'
                          : signer.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CounterSignQueueSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-9 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
