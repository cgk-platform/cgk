'use client'

/**
 * Project Detail Page
 *
 * Shows project details, deliverables, and allows work submission.
 */

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Button,
  Badge,
} from '@cgk-platform/ui'
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

import type { ContractorProject } from '@/lib/types'
import { getStatusLabel, getStatusColor, canTransitionTo } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [project, setProject] = useState<ContractorProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/contractor/projects/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Project not found')
          }
          throw new Error('Failed to fetch project')
        }
        const data = await response.json()
        setProject(data.project)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  const handleStartProject = async () => {
    if (!project) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/contractor/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!response.ok) throw new Error('Failed to start project')
      const data = await response.json()
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitWork = async () => {
    if (!project) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/contractor/projects/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [],
          links: [],
          notes: 'Work submitted',
        }),
      })
      if (!response.ok) throw new Error('Failed to submit work')
      const data = await response.json()
      setProject(data.project)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit work')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive">{error ?? 'Project not found'}</p>
            <Link href="/projects" className="mt-4 text-sm underline hover:no-underline">
              Return to projects
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dueDate = project.dueDate ? new Date(project.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()
  const canStart = canTransitionTo(project.status, 'in_progress')
  const canSubmit = canTransitionTo(project.status, 'submitted')

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={cn('text-sm', getStatusColor(project.status))}
            >
              {getStatusLabel(project.status)}
            </Badge>
            {dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {isOverdue ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Due {dueDate.toLocaleDateString()}
              </div>
            )}
            {project.rateCents && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                ${(project.rateCents / 100).toFixed(2)}
                {project.rateType === 'hourly' && '/hr'}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canStart && (
            <Button onClick={handleStartProject} disabled={isSubmitting}>
              Start Project
            </Button>
          )}
          {canSubmit && (
            <Button onClick={handleSubmitWork} disabled={isSubmitting}>
              <Upload className="mr-2 h-4 w-4" />
              Submit Work
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Project Brief</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Deliverables */}
          {project.deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Deliverables</h2>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {project.deliverables.map((deliverable) => (
                    <li
                      key={deliverable.id}
                      className="flex items-start gap-3"
                    >
                      <div
                        className={cn(
                          'mt-0.5 rounded-full p-1',
                          deliverable.completed
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p
                          className={cn(
                            'font-medium',
                            deliverable.completed && 'line-through opacity-60'
                          )}
                        >
                          {deliverable.title}
                        </p>
                        {deliverable.description && (
                          <p className="text-sm text-muted-foreground">
                            {deliverable.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Submitted Work */}
          {project.submittedWork && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Submitted Work</h2>
              </CardHeader>
              <CardContent>
                {project.submittedWork.files.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Files</h3>
                    <ul className="space-y-2">
                      {project.submittedWork.files.map((file, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {file.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.submittedWork.links.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Links</h3>
                    <ul className="space-y-2">
                      {project.submittedWork.links.map((link, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.submittedWork.notes && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.submittedWork.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Revision Notes */}
          {project.revisionNotes && (
            <Card className="border-warning">
              <CardHeader>
                <h2 className="font-semibold text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Revision Requested
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {project.revisionNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Project Info</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </p>
                <p className="mt-1 font-medium">{getStatusLabel(project.status)}</p>
              </div>

              {project.rateCents && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Rate
                  </p>
                  <p className="mt-1 font-medium">
                    ${(project.rateCents / 100).toFixed(2)}
                    {project.rateType === 'hourly' ? '/hour' : ' (project rate)'}
                  </p>
                </div>
              )}

              {dueDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Due Date
                  </p>
                  <p className={cn('mt-1 font-medium', isOverdue && 'text-destructive')}>
                    {dueDate.toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                  </p>
                </div>
              )}

              {project.submittedAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Submitted
                  </p>
                  <p className="mt-1 font-medium">
                    {new Date(project.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {project.approvedAt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Approved
                  </p>
                  <p className="mt-1 font-medium">
                    {new Date(project.approvedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
