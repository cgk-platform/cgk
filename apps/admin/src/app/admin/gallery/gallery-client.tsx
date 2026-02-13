'use client'

/**
 * Gallery Client Component
 * Interactive grid with moderation actions and detail modal
 */

import { Badge, Button, Card, cn } from '@cgk-platform/ui'
import {
  CheckCircle,
  Clock,
  Mail,
  Package,
  Phone,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useCallback, useState, useTransition } from 'react'

import { GalleryStats } from './gallery-stats'

import type { UGCGalleryStats, UGCSubmission, UGCSubmissionStatus } from '@/lib/admin-utilities/types'

interface GalleryClientProps {
  initialSubmissions: UGCSubmission[]
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export function GalleryClient({ initialSubmissions }: GalleryClientProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<UGCSubmission | null>(null)
  const [isPending, startTransition] = useTransition()

  // Calculate stats from current submissions
  const stats: UGCGalleryStats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }

  // Filter submissions based on active filter
  const filteredSubmissions =
    activeFilter === 'all'
      ? submissions
      : submissions.filter((s) => s.status === activeFilter)

  const handleModerate = useCallback(
    async (id: string, action: 'approve' | 'reject', notes?: string) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/gallery/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, notes }),
          })

          if (res.ok) {
            const { submission } = await res.json()
            setSubmissions((prev) =>
              prev.map((s) => (s.id === id ? submission : s))
            )
            if (selectedSubmission?.id === id) {
              setSelectedSubmission(submission)
            }
          }
        } catch (error) {
          console.error('Failed to moderate submission:', error)
        }
      })
    },
    [selectedSubmission]
  )

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/gallery/${id}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          setSubmissions((prev) => prev.filter((s) => s.id !== id))
          setSelectedSubmission(null)
        }
      } catch (error) {
        console.error('Failed to delete submission:', error)
      }
    })
  }, [])

  return (
    <>
      {/* Stats with filter functionality */}
      <GalleryStats
        stats={stats}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Gallery Grid */}
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          {filteredSubmissions.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isPending={isPending}
                  onSelect={() => setSelectedSubmission(submission)}
                  onApprove={() => handleModerate(submission.id, 'approve')}
                  onReject={() => handleModerate(submission.id, 'reject')}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          isPending={isPending}
          onClose={() => setSelectedSubmission(null)}
          onApprove={(notes) => handleModerate(selectedSubmission.id, 'approve', notes)}
          onReject={(notes) => handleModerate(selectedSubmission.id, 'reject', notes)}
          onDelete={() => handleDelete(selectedSubmission.id)}
        />
      )}
    </>
  )
}

// ============================================================================
// Submission Card
// ============================================================================

interface SubmissionCardProps {
  submission: UGCSubmission
  isPending: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: () => void
}

function SubmissionCard({
  submission,
  isPending,
  onSelect,
  onApprove,
  onReject,
}: SubmissionCardProps) {
  const [showAfter, setShowAfter] = useState(false)

  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-white transition-all',
        'hover:shadow-lg hover:shadow-stone-200/50',
        submission.status === 'pending' && 'ring-2 ring-amber-200'
      )}
    >
      {/* Image Container with Before/After Toggle */}
      <div
        className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-stone-100"
        onClick={onSelect}
        onMouseEnter={() => setShowAfter(true)}
        onMouseLeave={() => setShowAfter(false)}
      >
        {/* Before Image */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            showAfter ? 'opacity-0' : 'opacity-100'
          )}
        >
          <Image
            src={submission.beforeImageUrl || '/placeholder-image.jpg'}
            alt="Before"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white">
            BEFORE
          </span>
        </div>

        {/* After Image */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            showAfter ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image
            src={submission.afterImageUrl || '/placeholder-image.jpg'}
            alt="After"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 font-mono text-xs text-black">
            AFTER
          </span>
        </div>

        {/* Status Badge */}
        <StatusBadge status={submission.status} className="absolute right-3 top-3" />

        {/* Hover indicator */}
        <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs font-medium text-white">
            {showAfter ? 'Showing After' : 'Hover for After'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-stone-900">
              {submission.customerName || 'Anonymous'}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              {new Date(submission.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {submission.testimonial && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">
            "{submission.testimonial}"
          </p>
        )}

        {/* Quick Actions for Pending */}
        {submission.status === 'pending' && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={(e) => {
                e.stopPropagation()
                onApprove()
              }}
              disabled={isPending}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={(e) => {
                e.stopPropagation()
                onReject()
              }}
              disabled={isPending}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

// ============================================================================
// Submission Modal
// ============================================================================

interface SubmissionModalProps {
  submission: UGCSubmission
  isPending: boolean
  onClose: () => void
  onApprove: (notes?: string) => void
  onReject: (notes?: string) => void
  onDelete: () => void
}

function SubmissionModal({
  submission,
  isPending,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: SubmissionModalProps) {
  const [reviewNotes, setReviewNotes] = useState('')
  const [imageView, setImageView] = useState<'before' | 'after' | 'split'>('split')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-stone-400">
              Submission Review
            </p>
            <h2 className="mt-1 font-serif text-xl text-stone-900">
              {submission.customerName || 'Anonymous Submission'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={submission.status} />
            <button
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Images Section */}
          <div className="flex-1 bg-stone-100 p-6">
            {/* View Toggle */}
            <div className="mb-4 flex justify-center gap-1 rounded-lg bg-white p-1 shadow-sm">
              {(['before', 'split', 'after'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setImageView(view)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                    imageView === view
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  )}
                >
                  {view === 'split' ? 'Side by Side' : view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {/* Images */}
            <div
              className={cn(
                'grid gap-4',
                imageView === 'split' ? 'grid-cols-2' : 'grid-cols-1'
              )}
            >
              {(imageView === 'before' || imageView === 'split') && (
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white shadow-sm">
                  <Image
                    src={submission.beforeImageUrl || '/placeholder-image.jpg'}
                    alt="Before"
                    fill
                    className="object-contain"
                  />
                  <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white">
                    BEFORE
                  </span>
                </div>
              )}
              {(imageView === 'after' || imageView === 'split') && (
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white shadow-sm">
                  <Image
                    src={submission.afterImageUrl || '/placeholder-image.jpg'}
                    alt="After"
                    fill
                    className="object-contain"
                  />
                  <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 font-mono text-xs text-black">
                    AFTER
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="w-full overflow-y-auto border-t border-stone-200 bg-white lg:w-96 lg:border-l lg:border-t-0">
            <div className="p-6">
              {/* Customer Info */}
              <section className="mb-6">
                <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Name"
                    value={submission.customerName || 'Not provided'}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={submission.customerEmail || 'Not provided'}
                  />
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={submission.customerPhone || 'Not provided'}
                  />
                </div>
              </section>

              {/* Products & Duration */}
              {(submission.productsUsed?.length > 0 || submission.durationDays) && (
                <section className="mb-6">
                  <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                    Usage Details
                  </h3>
                  <div className="space-y-3">
                    {submission.productsUsed?.length > 0 && (
                      <InfoRow
                        icon={<Package className="h-4 w-4" />}
                        label="Products"
                        value={submission.productsUsed.join(', ')}
                      />
                    )}
                    {submission.durationDays && (
                      <InfoRow
                        icon={<Clock className="h-4 w-4" />}
                        label="Duration"
                        value={`${submission.durationDays} days`}
                      />
                    )}
                  </div>
                </section>
              )}

              {/* Testimonial */}
              {submission.testimonial && (
                <section className="mb-6">
                  <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                    Testimonial
                  </h3>
                  <blockquote className="rounded-lg border-l-4 border-stone-300 bg-stone-50 p-4 italic text-stone-700">
                    "{submission.testimonial}"
                  </blockquote>
                </section>
              )}

              {/* Consent */}
              <section className="mb-6">
                <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                  Consent
                </h3>
                <div className="flex gap-3">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      submission.consentMarketing
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-500'
                    )}
                  >
                    Marketing: {submission.consentMarketing ? 'Yes' : 'No'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      submission.consentTerms
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-500'
                    )}
                  >
                    Terms: {submission.consentTerms ? 'Yes' : 'No'}
                  </span>
                </div>
              </section>

              {/* Review History */}
              {submission.reviewedAt && (
                <section className="mb-6">
                  <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                    Review History
                  </h3>
                  <div className="rounded-lg bg-stone-50 p-3">
                    <p className="text-sm text-stone-600">
                      Reviewed by{' '}
                      <span className="font-medium">{submission.reviewedBy}</span>
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(submission.reviewedAt).toLocaleString()}
                    </p>
                    {submission.reviewNotes && (
                      <p className="mt-2 text-sm text-stone-600">
                        Notes: {submission.reviewNotes}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Review Notes Input */}
              <section className="mb-6">
                <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-stone-400">
                  Review Notes
                </h3>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for this review (optional)..."
                  className="w-full rounded-lg border border-stone-200 p-3 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  rows={3}
                />
              </section>

              {/* Actions */}
              <section className="space-y-3">
                {submission.status === 'pending' ? (
                  <>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onApprove(reviewNotes)}
                      disabled={isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Submission
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => onReject(reviewNotes)}
                      disabled={isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Submission
                    </Button>
                  </>
                ) : (
                  <div className="rounded-lg bg-stone-100 p-4 text-center text-sm text-stone-600">
                    This submission has been {submission.status}
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full text-stone-500 hover:text-rose-600"
                  onClick={onDelete}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Submission
                </Button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({
  status,
  className,
}: {
  status: UGCSubmissionStatus
  className?: string
}) {
  const variants: Record<UGCSubmissionStatus, { variant: 'warning' | 'success' | 'destructive'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  }

  const { variant, label } = variants[status]

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-stone-400">{icon}</span>
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        <p className="text-sm text-stone-900">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ filter }: { filter: FilterStatus }) {
  const messages: Record<FilterStatus, { title: string; description: string }> = {
    all: {
      title: 'No submissions yet',
      description: 'Customer submissions will appear here once they start coming in.',
    },
    pending: {
      title: 'All caught up!',
      description: 'There are no submissions waiting for review.',
    },
    approved: {
      title: 'No approved submissions',
      description: 'Approved customer photos will appear here.',
    },
    rejected: {
      title: 'No rejected submissions',
      description: 'Rejected submissions will appear here.',
    },
  }

  const { title, description } = messages[filter]

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-stone-100 p-4">
        <Package className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="font-serif text-xl text-stone-900">{title}</h3>
      <p className="mt-2 max-w-md text-stone-500">{description}</p>
    </div>
  )
}
