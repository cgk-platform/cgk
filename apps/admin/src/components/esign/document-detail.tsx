/**
 * Document Detail Component
 *
 * Displays full document details including signers, fields, and audit trail.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cgk-platform/ui'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Send,
  Shield,
  User,
  X,
  XCircle,
} from 'lucide-react'
import type {
  EsignAuditLogEntry,
  EsignDocumentStatus,
  EsignDocumentWithSigners,
  EsignSignerStatus,
} from '@/lib/esign/types'
import { DocumentStatusBadge, SignerStatusBadge } from './document-status-badge'

interface DocumentDetailProps {
  document: EsignDocumentWithSigners
  auditLog?: EsignAuditLogEntry[]
  onVoid?: () => Promise<void>
  onResend?: (signerId?: string) => Promise<void>
  onDownload?: (signed?: boolean) => void
  className?: string
}

const statusConfig: Record<EsignDocumentStatus, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  draft: { icon: FileText, color: 'text-slate-500' },
  pending: { icon: Clock, color: 'text-amber-500' },
  in_progress: { icon: RefreshCw, color: 'text-sky-500' },
  completed: { icon: Check, color: 'text-emerald-500' },
  declined: { icon: XCircle, color: 'text-red-500' },
  voided: { icon: X, color: 'text-slate-500' },
  expired: { icon: AlertCircle, color: 'text-amber-500' },
}

const signerStatusIcons: Record<EsignSignerStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  sent: Send,
  viewed: Eye,
  signed: Check,
  declined: XCircle,
}

export function DocumentDetail({
  document,
  auditLog = [],
  onVoid,
  onResend,
  onDownload,
  className,
}: DocumentDetailProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Used for future enhancements (icon display in header)
  void statusConfig[document.status].icon

  const handleVoid = async () => {
    if (!onVoid || isProcessing) return
    setIsProcessing(true)
    try {
      await onVoid()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResend = async (signerId?: string) => {
    if (!onResend || isProcessing) return
    setIsProcessing(true)
    try {
      await onResend(signerId)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/esign/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {document.name}
              </h1>
              <DocumentStatusBadge status={document.status} />
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {formatDate(document.createdAt)}
              </span>
              {document.templateName && (
                <span>Template: {document.templateName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(document.status === 'completed')}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
          {['pending', 'in_progress'].includes(document.status) && onResend && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResend()}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Mail className="h-4 w-4" />
              Resend All
            </Button>
          )}
          {['pending', 'in_progress', 'draft'].includes(document.status) && onVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoid}
              disabled={isProcessing}
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Message */}
      {document.message && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Message:</span> {document.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="signers">
        <TabsList>
          <TabsTrigger value="signers" className="gap-1.5">
            <User className="h-4 w-4" />
            Signers ({document.signers.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="h-4 w-4" />
            Audit Trail ({auditLog.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Signers Tab */}
        <TabsContent value="signers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {document.signers.map((signer) => {
                  // Icon available for future use
                  void signerStatusIcons[signer.status]
                  return (
                    <div
                      key={signer.id}
                      className={cn(
                        'flex items-center justify-between p-4',
                        'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            'bg-slate-100 dark:bg-slate-800'
                          )}
                        >
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {signer.signingOrder}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {signer.name}
                            </p>
                            <SignerStatusBadge status={signer.status} />
                            {signer.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{signer.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          {signer.signedAt && (
                            <p className="text-emerald-600 dark:text-emerald-400">
                              Signed {formatDate(signer.signedAt)}
                            </p>
                          )}
                          {signer.viewedAt && !signer.signedAt && (
                            <p className="text-sky-600 dark:text-sky-400">
                              Viewed {formatDate(signer.viewedAt)}
                            </p>
                          )}
                          {signer.sentAt && !signer.viewedAt && (
                            <p className="text-slate-500">
                              Sent {formatDate(signer.sentAt)}
                            </p>
                          )}
                          {signer.declinedAt && (
                            <p className="text-red-600 dark:text-red-400">
                              Declined {formatDate(signer.declinedAt)}
                            </p>
                          )}
                        </div>

                        {['pending', 'sent', 'viewed'].includes(signer.status) && onResend && (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedMenu(expandedMenu === signer.id ? null : signer.id)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {expandedMenu === signer.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setExpandedMenu(null)}
                                />
                                <div
                                  className={cn(
                                    'absolute right-0 top-full z-20 mt-1 w-36',
                                    'rounded-lg border bg-white shadow-lg',
                                    'dark:border-slate-700 dark:bg-slate-800',
                                    'py-1'
                                  )}
                                >
                                  <button
                                    onClick={() => {
                                      handleResend(signer.id)
                                      setExpandedMenu(null)
                                    }}
                                    className={cn(
                                      'flex w-full items-center gap-2 px-3 py-2 text-sm',
                                      'hover:bg-slate-50 dark:hover:bg-slate-700',
                                      'text-slate-700 dark:text-slate-300'
                                    )}
                                  >
                                    <Mail className="h-4 w-4" />
                                    Resend
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-400" />
                <CardTitle className="text-base">Document Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditLog.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No audit entries yet
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="space-y-0">
                      {auditLog.map((entry) => (
                        <div
                          key={entry.id}
                          className={cn(
                            'relative flex gap-4 py-4 px-4',
                            'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          )}
                        >
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              'relative z-10 flex h-5 w-5 items-center justify-center rounded-full',
                              'bg-white dark:bg-slate-900',
                              'border-2',
                              entry.action === 'signed'
                                ? 'border-emerald-500'
                                : entry.action === 'declined'
                                  ? 'border-red-500'
                                  : entry.action === 'viewed'
                                    ? 'border-sky-500'
                                    : 'border-slate-300'
                            )}
                          >
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                entry.action === 'signed'
                                  ? 'bg-emerald-500'
                                  : entry.action === 'declined'
                                    ? 'bg-red-500'
                                    : entry.action === 'viewed'
                                      ? 'bg-sky-500'
                                      : 'bg-slate-300'
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {formatAction(entry.action)}
                              </p>
                              <time className="text-xs text-slate-500">
                                {formatDate(entry.createdAt)}
                              </time>
                            </div>
                            <p className="text-sm text-slate-500">
                              by {entry.performedBy}
                            </p>
                            {entry.ipAddress && (
                              <p className="text-xs text-slate-400 mt-1">
                                IP: {entry.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="py-4">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Document ID</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                    {document.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Status</dt>
                  <dd className="mt-1">
                    <DocumentStatusBadge status={document.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Created</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {formatDate(document.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Created By</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {document.createdBy}
                  </dd>
                </div>
                {document.expiresAt && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Expires</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                      {formatDate(document.expiresAt)}
                    </dd>
                  </div>
                )}
                {document.completedAt && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Completed</dt>
                    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                      {formatDate(document.completedAt)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-slate-500">Reminders</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                    {document.reminderEnabled
                      ? `Every ${document.reminderDays} days`
                      : 'Disabled'}
                  </dd>
                </div>
                {document.templateId && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Template</dt>
                    <dd className="mt-1 text-sm">
                      <Link
                        href={`/admin/esign/templates/${document.templateId}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {document.templateName || document.templateId}
                      </Link>
                    </dd>
                  </div>
                )}
                {document.creatorId && (
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Creator</dt>
                    <dd className="mt-1 text-sm">
                      <Link
                        href={`/admin/creators/${document.creatorId}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {document.creatorName || document.creatorId}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
