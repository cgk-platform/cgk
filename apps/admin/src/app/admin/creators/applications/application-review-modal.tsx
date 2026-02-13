'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@cgk-platform/ui'

import type { CreatorApplication } from '@/lib/creators-admin-ops'
import { REJECTION_TEMPLATES } from '@/lib/creators-admin-ops'
import { formatDateTime } from '@/lib/format'

interface Props {
  application: CreatorApplication
  onClose: () => void
}

export function ApplicationReviewModal({ application, onClose }: Props) {
  const [action, setAction] = useState<'approve' | 'reject' | 'waitlist' | null>(null)
  const [loading, setLoading] = useState(false)

  // Approve form state
  const [commissionPercent, setCommissionPercent] = useState(10)
  const [discountCode, setDiscountCode] = useState('')
  const [tier, setTier] = useState('bronze')
  const [notes, setNotes] = useState('')
  const [sendNotification, setSendNotification] = useState(true)

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState(REJECTION_TEMPLATES[0])
  const [customReason, setCustomReason] = useState('')

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/creators/applications/${application.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPercent,
          discountCode: discountCode || undefined,
          tier,
          notes: notes || undefined,
          sendNotification,
        }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve application')
      }
    } catch {
      alert('Failed to approve application')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = rejectionReason === 'custom' ? customReason : rejectionReason
    if (!reason) {
      alert('Please provide a rejection reason')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/creators/applications/${application.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          sendNotification,
        }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject application')
      }
    } catch {
      alert('Failed to reject application')
    } finally {
      setLoading(false)
    }
  }

  const handleWaitlist = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/creators/applications/${application.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || undefined }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to waitlist application')
      }
    } catch {
      alert('Failed to waitlist application')
    } finally {
      setLoading(false)
    }
  }

  const canTakeAction = application.status === 'new' || application.status === 'in_review'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
          <h2 className="text-lg font-semibold">Application Review</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="space-y-6 p-4">
          {/* Applicant Info */}
          <section className="space-y-3">
            <h3 className="font-medium">Applicant Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{application.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p>{application.email}</p>
              </div>
              {application.phone && (
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p>{application.phone}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Applied</Label>
                <p>{formatDateTime(application.created_at)}</p>
              </div>
            </div>
          </section>

          {/* Social Profiles */}
          <section className="space-y-3">
            <h3 className="font-medium">Social Profiles</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {application.instagram && (
                <a
                  href={`https://instagram.com/${application.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                >
                  <span className="text-sm font-medium">Instagram</span>
                  <span className="text-sm text-muted-foreground">@{application.instagram}</span>
                </a>
              )}
              {application.tiktok && (
                <a
                  href={`https://tiktok.com/@${application.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                >
                  <span className="text-sm font-medium">TikTok</span>
                  <span className="text-sm text-muted-foreground">@{application.tiktok}</span>
                </a>
              )}
              {application.youtube && (
                <a
                  href={`https://youtube.com/@${application.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                >
                  <span className="text-sm font-medium">YouTube</span>
                  <span className="text-sm text-muted-foreground">@{application.youtube}</span>
                </a>
              )}
            </div>
            {application.follower_count && (
              <p className="text-sm">
                <span className="font-medium">{application.follower_count.toLocaleString()}</span>{' '}
                total followers
              </p>
            )}
          </section>

          {/* Bio & Why Interested */}
          {(application.bio || application.why_interested) && (
            <section className="space-y-3">
              {application.bio && (
                <div>
                  <Label className="text-muted-foreground">Bio</Label>
                  <p className="mt-1 text-sm">{application.bio}</p>
                </div>
              )}
              {application.why_interested && (
                <div>
                  <Label className="text-muted-foreground">Why They're Interested</Label>
                  <p className="mt-1 text-sm">{application.why_interested}</p>
                </div>
              )}
              {application.previous_partnerships && (
                <div>
                  <Label className="text-muted-foreground">Previous Partnerships</Label>
                  <p className="mt-1 text-sm">{application.previous_partnerships}</p>
                </div>
              )}
            </section>
          )}

          {/* Action Forms */}
          {canTakeAction && (
            <section className="space-y-4 border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant={action === 'approve' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAction('approve')}
                >
                  Approve
                </Button>
                <Button
                  variant={action === 'waitlist' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAction('waitlist')}
                >
                  Waitlist
                </Button>
                <Button
                  variant={action === 'reject' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setAction('reject')}
                >
                  Reject
                </Button>
              </div>

              {action === 'approve' && (
                <div className="space-y-4 rounded-md border p-4">
                  <h4 className="font-medium">Approval Settings</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="commission">Commission Rate (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Discount Code (optional)</Label>
                      <Input
                        id="code"
                        placeholder="Auto-generated if empty"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier">Starting Tier</Label>
                      <select
                        id="tier"
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                      >
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Internal Notes</Label>
                      <Input
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded"
                    />
                    Send welcome email to applicant
                  </label>
                  <Button onClick={handleApprove} disabled={loading}>
                    {loading ? 'Processing...' : 'Approve Application'}
                  </Button>
                </div>
              )}

              {action === 'reject' && (
                <div className="space-y-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
                  <h4 className="font-medium">Rejection Reason</h4>
                  <div className="space-y-2">
                    {REJECTION_TEMPLATES.map((template, i) => (
                      <label key={i} className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name="rejection"
                          checked={rejectionReason === template}
                          onChange={() => setRejectionReason(template)}
                          className="mt-0.5"
                        />
                        {template}
                      </label>
                    ))}
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="rejection"
                        checked={rejectionReason === 'custom'}
                        onChange={() => setRejectionReason('custom')}
                        className="mt-0.5"
                      />
                      Custom message
                    </label>
                    {rejectionReason === 'custom' && (
                      <textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Enter custom rejection message..."
                        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={3}
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded"
                    />
                    Send rejection email to applicant
                  </label>
                  <Button variant="destructive" onClick={handleReject} disabled={loading}>
                    {loading ? 'Processing...' : 'Reject Application'}
                  </Button>
                </div>
              )}

              {action === 'waitlist' && (
                <div className="space-y-4 rounded-md border p-4">
                  <h4 className="font-medium">Waitlist Notes</h4>
                  <div>
                    <Label htmlFor="waitlist-notes">Internal Notes (optional)</Label>
                    <textarea
                      id="waitlist-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this applicant..."
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleWaitlist} disabled={loading}>
                    {loading ? 'Processing...' : 'Add to Waitlist'}
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Already processed */}
          {!canTakeAction && application.reviewed_at && (
            <section className="border-t pt-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  {application.status.replace('_', ' ')}
                </p>
                <p>
                  <span className="font-medium">Reviewed:</span>{' '}
                  {formatDateTime(application.reviewed_at)}
                </p>
                {application.rejection_reason && (
                  <p className="mt-2">
                    <span className="font-medium">Reason:</span> {application.rejection_reason}
                  </p>
                )}
                {application.internal_notes && (
                  <p className="mt-2">
                    <span className="font-medium">Notes:</span> {application.internal_notes}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t bg-background p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
