'use client'

import Link from 'next/link'

import type { Project } from '@/lib/projects'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface ProjectCardProps {
  project: Project
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(date: Date | null): string {
  if (!date) return 'No due date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getDaysUntilDue(date: Date | null): { text: string; urgent: boolean } | null {
  if (!date) return null

  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, urgent: true }
  } else if (diffDays === 0) {
    return { text: 'Due today', urgent: true }
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', urgent: true }
  } else if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, urgent: true }
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, urgent: false }
  }
  return null
}

export function ProjectCard({ project }: ProjectCardProps): React.JSX.Element {
  const dueInfo = getDaysUntilDue(project.dueDate)
  const isEditable = ['draft', 'revision_requested'].includes(project.status)

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-accent/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">{project.title}</h3>
          {project.brandName && (
            <p className="text-sm text-muted-foreground">{project.brandName}</p>
          )}
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      {/* Meta info */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        {/* Due date */}
        <div className="flex items-center gap-1.5">
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
            className="text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span className={dueInfo?.urgent ? 'font-medium text-destructive' : 'text-muted-foreground'}>
            {formatDate(project.dueDate)}
          </span>
        </div>

        {/* Payment */}
        {project.paymentCents > 0 && (
          <div className="flex items-center gap-1.5">
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
              className="text-muted-foreground"
            >
              <line x1="12" x2="12" y1="2" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-muted-foreground">
              {formatCurrency(project.paymentCents)}
            </span>
          </div>
        )}

        {/* Files */}
        {project.fileCount !== undefined && (
          <div className="flex items-center gap-1.5">
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
              className="text-muted-foreground"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-muted-foreground">
              {project.fileCount} {project.fileCount === 1 ? 'file' : 'files'}
            </span>
          </div>
        )}
      </div>

      {/* Urgent due warning */}
      {dueInfo?.urgent && isEditable && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          {dueInfo.text}
        </div>
      )}

      {/* Revision requested indicator */}
      {project.status === 'revision_requested' && project.feedback && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-orange-100 px-3 py-2 text-sm text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Revisions requested - tap to view feedback
        </div>
      )}
    </Link>
  )
}
