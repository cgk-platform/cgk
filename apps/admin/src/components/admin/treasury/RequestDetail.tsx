'use client'

import { Button } from '@cgk/ui'
import { Card, CardContent, CardHeader } from '@cgk/ui'
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Mail,
  Download,
  User,
  Calendar,
  DollarSign,
  Send,
  X,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'

import { CommunicationLog } from './CommunicationLog'
import type { DrawRequestWithDetails, DrawRequestStatus } from '@/lib/treasury/types'

interface RequestDetailProps {
  request: DrawRequestWithDetails
  onClose: () => void
  onRefresh: () => void
}

function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RequestDetail({ request, onClose, onRefresh }: RequestDetailProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const handleAction = async (action: string, extraData?: Record<string, string>) => {
    setActionLoading(action)
    setError(null)

    try {
      const response = await fetch(`/api/admin/treasury/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      onRefresh()
      if (action === 'reject') {
        setShowRejectForm(false)
        setRejectReason('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto max-w-4xl">
        <Card className="relative overflow-hidden border-slate-200 shadow-2xl">
          {/* Header */}
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <StatusIcon status={request.status} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {request.request_number}
                    </h2>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{request.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Error display */}
            {error && (
              <div className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 lg:border-r lg:border-slate-100">
                {/* Amount */}
                <div className="border-b border-slate-100 p-6">
                  <p className="text-sm font-medium text-slate-500">Total Amount</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-emerald-600">
                    {formatMoney(request.total_amount_cents)}
                  </p>
                </div>

                {/* Line Items */}
                <div className="border-b border-slate-100 p-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Line Items ({request.items.length})
                  </h3>
                  <div className="space-y-3">
                    {request.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{item.creator_name}</span>
                          {item.project_description && (
                            <p className="text-sm text-slate-500">{item.project_description}</p>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatMoney(item.net_amount_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="border-b border-slate-100 p-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </h3>

                    {showRejectForm ? (
                      <div className="space-y-3">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Rejection reason (required)"
                          className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRejectForm(false)
                              setRejectReason('')
                            }}
                            disabled={!!actionLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleAction('reject', { reason: rejectReason })}
                            disabled={!rejectReason.trim() || !!actionLoading}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            {actionLoading === 'reject' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Confirm Rejection
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => handleAction('approve')}
                          disabled={!!actionLoading}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {actionLoading === 'approve' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectForm(true)}
                          disabled={!!actionLoading}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAction('send-email')}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === 'send-email' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Send Email
                        </Button>
                        {!request.pdf_url && (
                          <Button
                            variant="outline"
                            onClick={() => handleAction('generate-pdf')}
                            disabled={!!actionLoading}
                          >
                            {actionLoading === 'generate-pdf' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="mr-2 h-4 w-4" />
                            )}
                            Generate PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Communications Log */}
                <div className="p-6">
                  <CommunicationLog communications={request.communications} />
                </div>
              </div>

              {/* Sidebar */}
              <div className="bg-slate-50/50 p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Details
                </h3>

                <div className="space-y-4">
                  <DetailItem
                    icon={<User className="h-4 w-4" />}
                    label="Treasurer"
                    value={request.treasurer_name}
                    subvalue={request.treasurer_email}
                  />

                  {request.signers.length > 0 && (
                    <DetailItem
                      icon={<User className="h-4 w-4" />}
                      label="Signers"
                      value={request.signers.join(', ')}
                    />
                  )}

                  <DetailItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Created"
                    value={formatDateTime(request.created_at)}
                  />

                  {request.due_date && (
                    <DetailItem
                      icon={<Calendar className="h-4 w-4" />}
                      label="Due Date"
                      value={formatDate(request.due_date)}
                    />
                  )}

                  {request.approved_at && (
                    <DetailItem
                      icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      label="Approved"
                      value={formatDateTime(request.approved_at)}
                      subvalue={`by ${request.approved_by}`}
                    />
                  )}

                  {request.rejected_at && (
                    <DetailItem
                      icon={<XCircle className="h-4 w-4 text-red-500" />}
                      label="Rejected"
                      value={formatDateTime(request.rejected_at)}
                      subvalue={`by ${request.rejected_by}`}
                    />
                  )}

                  {request.rejection_reason && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                      <p className="mt-1 text-sm text-red-900">{request.rejection_reason}</p>
                    </div>
                  )}

                  {request.pdf_url && (
                    <a
                      href={request.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusIcon({ status, size = 'md' }: { status: DrawRequestStatus; size?: 'md' | 'lg' }) {
  const sizeClasses = {
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const iconSizes = {
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const styles = {
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-600',
    cancelled: 'bg-slate-100 text-slate-500',
  }

  const icons = {
    pending: <Clock className={iconSizes[size]} />,
    approved: <CheckCircle2 className={iconSizes[size]} />,
    rejected: <XCircle className={iconSizes[size]} />,
    cancelled: <XCircle className={iconSizes[size]} />,
  }

  return (
    <div className={`flex items-center justify-center rounded-xl ${sizeClasses[size]} ${styles[status]}`}>
      {icons[status]}
    </div>
  )
}

function StatusBadge({ status }: { status: DrawRequestStatus }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function DetailItem({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subvalue?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
        {subvalue && <p className="text-xs text-slate-500">{subvalue}</p>}
      </div>
    </div>
  )
}
