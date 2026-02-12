'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { FileDropzone, FileListItem } from '@/components/projects/FileDropzone'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import type { Project } from '@/lib/projects'

interface ProjectResponse {
  project: Project
  canEdit: boolean
}

export default function ProjectDetailPage(): React.JSX.Element {
  const params = useParams()
  const projectId = params.id as string

  const [data, setData] = useState<ProjectResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/creator/projects/${projectId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch project')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`/api/creator/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    // Refresh project data
    await fetchProject()
  }

  const handleFileDelete = async (fileId: string, fileUrl: string) => {
    const params = new URLSearchParams({ fileId, fileUrl })
    const response = await fetch(`/api/creator/projects/${projectId}/files?${params.toString()}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Delete failed')
    }

    // Refresh project data
    await fetchProject()
  }

  const handleSubmit = async () => {
    if (submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/creator/projects/${projectId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }

      // Refresh project data
      await fetchProject()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set'
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  const formatDateTime = (date: Date | null): string => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
        <p className="text-destructive">{error || 'Project not found'}</p>
        <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    )
  }

  const { project, canEdit } = data
  const canSubmit = canEdit && (project.files?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.brandName && (
            <p className="mt-1 text-muted-foreground">{project.brandName}</p>
          )}
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
                Submit for Review
              </>
            )}
          </button>
        )}
      </div>

      {submitError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {submitError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {project.description && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {project.description}
              </p>
            </div>
          )}

          {/* Brief */}
          {project.brief && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Creative Brief</h2>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {project.brief}
              </div>
            </div>
          )}

          {/* Revision feedback */}
          {project.status === 'revision_requested' && project.feedback && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-orange-600 dark:text-orange-400"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h2 className="font-semibold text-orange-700 dark:text-orange-400">
                  Revision Requested
                </h2>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-orange-700 dark:text-orange-300">
                {project.feedback}
              </p>
              {project.feedbackAt && (
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                  {formatDateTime(project.feedbackAt)}
                </p>
              )}
            </div>
          )}

          {/* Files section */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold">Deliverables</h2>

            {/* File upload */}
            {canEdit && (
              <div className="mt-4">
                <FileDropzone
                  onUpload={handleFileUpload}
                  disabled={!canEdit}
                />
              </div>
            )}

            {/* File list */}
            <div className="mt-4 space-y-2">
              {project.files && project.files.length > 0 ? (
                project.files.map((file) => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    onDelete={handleFileDelete}
                    canDelete={canEdit}
                  />
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No files uploaded yet
                </p>
              )}
            </div>
          </div>

          {/* Revision history */}
          {project.revisions && project.revisions.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-semibold">Revision History</h2>
              <div className="mt-4 space-y-4">
                {project.revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="border-l-2 border-muted pl-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Revision {revision.revisionNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          revision.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : revision.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : revision.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {revision.status}
                      </span>
                    </div>
                    {revision.requestNotes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <strong>Request:</strong> {revision.requestNotes}
                      </p>
                    )}
                    {revision.responseNotes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <strong>Response:</strong> {revision.responseNotes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested {formatDateTime(revision.requestedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Project details */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Project Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Due Date</dt>
                <dd className="font-medium">{formatDate(project.dueDate)}</dd>
              </div>
              {project.paymentCents > 0 && (
                <div>
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd className="font-medium">{formatCurrency(project.paymentCents)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Revisions</dt>
                <dd className="font-medium">
                  {project.revisionCount} / {project.maxRevisions} used
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Files</dt>
                <dd className="font-medium">{project.files?.length || 0} uploaded</dd>
              </div>
            </dl>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">Timeline</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Created</span>
                <span className="ml-auto text-xs">{formatDateTime(project.createdAt)}</span>
              </div>
              {project.submittedAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="ml-auto text-xs">{formatDateTime(project.submittedAt)}</span>
                </div>
              )}
              {project.approvedAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Approved</span>
                  <span className="ml-auto text-xs">{formatDateTime(project.approvedAt)}</span>
                </div>
              )}
              {project.completedAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Completed</span>
                  <span className="ml-auto text-xs">{formatDateTime(project.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Help */}
          {canEdit && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="text-sm font-semibold">Need help?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your deliverables and submit when ready. Your brand will review and provide feedback.
              </p>
              <Link
                href="/help"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                View FAQ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
