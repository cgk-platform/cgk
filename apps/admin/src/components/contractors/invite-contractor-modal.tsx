'use client'

import { Button, Input, Label, Textarea, Checkbox } from '@cgk-platform/ui'
import { X, Mail, CheckCircle, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'

interface InviteContractorModalProps {
  isOpen: boolean
  onClose: () => void
}

interface InviteFormState {
  email: string
  name: string
  message: string
  assignProject: boolean
  projectTitle: string
  projectDueDate: string
  projectRate: string
}

export function InviteContractorModal({ isOpen, onClose }: InviteContractorModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<InviteFormState>({
    email: '',
    name: '',
    message: '',
    assignProject: false,
    projectTitle: '',
    projectDueDate: '',
    projectRate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.email) {
      setError('Email is required')
      return
    }

    if (form.assignProject && !form.projectTitle) {
      setError('Project title is required when assigning a project')
      return
    }

    startTransition(async () => {
      const response = await fetch('/api/admin/contractors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name || undefined,
          message: form.message || undefined,
          projectAssignment: form.assignProject
            ? {
                title: form.projectTitle,
                dueDate: form.projectDueDate || undefined,
                rateCents: form.projectRate ? Math.round(parseFloat(form.projectRate) * 100) : undefined,
              }
            : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to send invitation')
        return
      }

      setSuccess(true)
    })
  }

  const handleClose = () => {
    setForm({
      email: '',
      name: '',
      message: '',
      assignProject: false,
      projectTitle: '',
      projectDueDate: '',
      projectRate: '',
    })
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handleInviteAnother = () => {
    setForm({
      email: '',
      name: '',
      message: '',
      assignProject: false,
      projectTitle: '',
      projectDueDate: '',
      projectRate: '',
    })
    setSuccess(false)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invite Contractor</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Invitation Sent</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              An invitation has been sent to <span className="font-medium">{form.email}</span>
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              <Button onClick={handleInviteAnother}>
                <Mail className="mr-2 h-4 w-4" />
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contractor@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the invitation..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                disabled={isPending}
                rows={3}
              />
            </div>

            {/* Project assignment toggle */}
            <div className="space-y-3 rounded-md border p-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.assignProject}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, assignProject: checked === true }))
                  }
                  disabled={isPending}
                />
                <span className="text-sm font-medium">Assign initial project</span>
              </label>

              {form.assignProject && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="projectTitle">
                      Project Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="projectTitle"
                      type="text"
                      placeholder="Website Redesign"
                      value={form.projectTitle}
                      onChange={(e) => setForm((f) => ({ ...f, projectTitle: e.target.value }))}
                      disabled={isPending}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="projectDueDate">Due Date (optional)</Label>
                      <Input
                        id="projectDueDate"
                        type="date"
                        value={form.projectDueDate}
                        onChange={(e) => setForm((f) => ({ ...f, projectDueDate: e.target.value }))}
                        disabled={isPending}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectRate">Rate ($) (optional)</Label>
                      <Input
                        id="projectRate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="500.00"
                        value={form.projectRate}
                        onChange={(e) => setForm((f) => ({ ...f, projectRate: e.target.value }))}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
