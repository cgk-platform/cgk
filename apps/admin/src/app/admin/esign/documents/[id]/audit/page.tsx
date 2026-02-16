/**
 * E-Signature Document Audit Trail Page
 *
 * Displays the complete audit history for a document.
 */

import { Card, CardContent, cn } from '@cgk-platform/ui'
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Timer,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { EsignAuditAction } from '@/lib/esign/types'

interface PageProps {
  params: Promise<{ id: string }>
}

interface AuditEntry {
  id: string
  documentId: string
  signerId: string | null
  action: EsignAuditAction
  actionLabel: string
  details: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  performedBy: string
  createdAt: string
  signerName: string | null
  signerEmail: string | null
}

interface AuditSummary {
  documentId: string
  documentName: string
  createdAt: string
  completedAt: string | null
  status: string
  totalEvents: number
  firstViewed: string | null
  firstSigned: string | null
  remindersSent: number
  signers: Array<{
    id: string
    name: string
    email: string
    status: string
    signedAt: string | null
    ipAddress: string | null
    userAgent: string | null
  }>
}

export default async function AuditTrailPage({ params }: PageProps) {
  const { id } = await params

  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return <NoTenantState />
  }

  const data = await fetchAuditData(tenantSlug, id)
  if (!data) {
    return <NotFoundState documentId={id} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/admin/esign/documents/${id}`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Document
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data.document.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={data.document.status} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Created"
          value={formatDateTime(data.summary.createdAt)}
          icon={FileText}
        />
        {data.summary.firstViewed && (
          <SummaryCard
            label="First Viewed"
            value={formatDateTime(data.summary.firstViewed)}
            icon={Eye}
          />
        )}
        {data.summary.completedAt && (
          <SummaryCard
            label="Completed"
            value={formatDateTime(data.summary.completedAt)}
            icon={Check}
            iconClass="text-emerald-600"
          />
        )}
        <SummaryCard
          label="Total Events"
          value={String(data.summary.totalEvents)}
          icon={Clock}
        />
      </div>

      {/* Signers Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
            Signers
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.summary.signers.map((signer) => (
              <div
                key={signer.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {signer.name}
                    </p>
                    <p className="text-sm text-slate-500">{signer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <SignerStatusBadge status={signer.status} />
                  {signer.signedAt && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(signer.signedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Timeline */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
            Activity Timeline
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-6">
              {data.audit.map((entry, idx) => (
                <AuditTimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={idx === data.audit.length - 1}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Certificate Section */}
      {data.document.status === 'completed' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Compliance Certificate
                  </h3>
                  <p className="text-sm text-slate-500">
                    Download the complete audit trail for compliance purposes
                  </p>
                </div>
              </div>
              <a
                href={`/api/admin/esign/documents/${id}/audit?format=pdf`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper functions and components

async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

async function fetchAuditData(
  tenantSlug: string,
  documentId: string
): Promise<{
  document: { id: string; name: string; status: string }
  audit: AuditEntry[]
  summary: AuditSummary
} | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    if (!baseUrl) {
      throw new Error('APP_URL or NEXT_PUBLIC_APP_URL environment variable is required')
    }
    const res = await fetch(`${baseUrl}/api/admin/esign/documents/${documentId}/audit`, {
      headers: {
        'x-tenant-slug': tenantSlug,
      },
      cache: 'no-store',
    })

    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass = 'text-slate-500',
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  iconClass?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg bg-slate-100 p-2 dark:bg-slate-800', iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
    in_progress: { label: 'In Progress', className: 'bg-sky-100 text-sky-700' },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
    declined: { label: 'Declined', className: 'bg-rose-100 text-rose-700' },
    voided: { label: 'Voided', className: 'bg-slate-100 text-slate-700' },
    expired: { label: 'Expired', className: 'bg-orange-100 text-orange-700' },
  }

  const { label, className } = config[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

function SignerStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
    sent: { label: 'Sent', className: 'bg-sky-100 text-sky-700' },
    viewed: { label: 'Viewed', className: 'bg-amber-100 text-amber-700' },
    signed: { label: 'Signed', className: 'bg-emerald-100 text-emerald-700' },
    declined: { label: 'Declined', className: 'bg-rose-100 text-rose-700' },
  }

  const { label, className } = config[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

function AuditTimelineEntry({
  entry,
  isLast,
}: {
  entry: AuditEntry
  isLast: boolean
}) {
  const actionConfig: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    created: { icon: FileText, color: 'bg-slate-100 text-slate-600' },
    sent: { icon: Send, color: 'bg-sky-100 text-sky-600' },
    viewed: { icon: Eye, color: 'bg-amber-100 text-amber-600' },
    field_filled: { icon: PenLine, color: 'bg-violet-100 text-violet-600' },
    signed: { icon: Check, color: 'bg-emerald-100 text-emerald-600' },
    declined: { icon: XCircle, color: 'bg-rose-100 text-rose-600' },
    voided: { icon: X, color: 'bg-slate-100 text-slate-600' },
    reminder_sent: { icon: Mail, color: 'bg-orange-100 text-orange-600' },
    resent: { icon: RotateCcw, color: 'bg-sky-100 text-sky-600' },
    counter_signed: { icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' },
    expired: { icon: Timer, color: 'bg-orange-100 text-orange-600' },
    downloaded: { icon: Download, color: 'bg-slate-100 text-slate-600' },
  }

  const { icon: Icon, color } = actionConfig[entry.action] || {
    icon: Clock,
    color: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="relative pl-10">
      {/* Icon */}
      <div
        className={cn(
          'absolute left-0 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
          color
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className={cn('pb-6', isLast && 'pb-0')}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {entry.actionLabel}
            </p>
            {entry.signerName && (
              <p className="text-sm text-slate-500">
                by {entry.signerName} ({entry.signerEmail})
              </p>
            )}
            {!entry.signerName && entry.performedBy !== 'system' && (
              <p className="text-sm text-slate-500">by {entry.performedBy}</p>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>

        {/* IP/User Agent */}
        {entry.ipAddress && (
          <p className="mt-1 text-xs text-slate-400">
            IP: {entry.ipAddress}
            {entry.userAgent && ` - ${shortenUserAgent(entry.userAgent)}`}
          </p>
        )}

        {/* Details */}
        {entry.details && Object.keys(entry.details).length > 0 && (
          <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {Object.entries(entry.details).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function shortenUserAgent(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Browser'
}

function NoTenantState() {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-slate-500">Tenant context required</p>
    </div>
  )
}

function NotFoundState({ documentId }: { documentId: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center text-center">
      <FileText className="h-10 w-10 text-slate-400" />
      <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
        Document Not Found
      </p>
      <p className="text-sm text-slate-500">
        Document {documentId} could not be found
      </p>
      <Link href="/admin/esign/documents">
        <span className="mt-4 text-sm text-primary hover:underline">
          Back to Documents
        </span>
      </Link>
    </div>
  )
}
