import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { ArrowLeft, Clock, DollarSign } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProjectStatusBadge } from '@/components/contractors'
import { formatDate, formatMoney } from '@/lib/format'
import { getContractorById, getContractorProjects } from '@/lib/contractors/db'
import type { ContractorProject } from '@/lib/contractors/types'
import { ContractorProjectActions } from './contractor-project-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContractorProjectsPage({ params }: PageProps) {
  const { id } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return <p className="text-muted-foreground">No tenant configured.</p>
  }

  const contractor = await getContractorById(tenantSlug, id)
  if (!contractor) {
    notFound()
  }

  const projects = await getContractorProjects(tenantSlug, id)

  // Group projects by status category
  const upcomingProjects = projects.filter((p) =>
    ['pending_contractor', 'draft'].includes(p.status),
  )
  const activeProjects = projects.filter((p) =>
    ['in_progress', 'submitted', 'revision_requested'].includes(p.status),
  )
  const completedProjects = projects.filter((p) =>
    ['approved', 'payout_ready', 'withdrawal_requested', 'payout_approved'].includes(p.status),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/contractors/${id}`}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{contractor.name}&apos;s Projects</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <ContractorProjectActions contractorId={id} contractorName={contractor.name} />
      </div>

      {/* Project lists by category */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming ({upcomingProjects.length})
          </h2>
          <div className="space-y-3">
            {upcomingProjects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No upcoming projects
                </CardContent>
              </Card>
            ) : (
              upcomingProjects.map((project) => (
                <ProjectCard key={project.id} project={project} contractorId={id} />
              ))
            )}
          </div>
        </div>

        {/* Active */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active ({activeProjects.length})
          </h2>
          <div className="space-y-3">
            {activeProjects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No active projects
                </CardContent>
              </Card>
            ) : (
              activeProjects.map((project) => (
                <ProjectCard key={project.id} project={project} contractorId={id} />
              ))
            )}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Completed ({completedProjects.length})
          </h2>
          <div className="space-y-3">
            {completedProjects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No completed projects
                </CardContent>
              </Card>
            ) : (
              completedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} contractorId={id} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  contractorId,
}: {
  project: ContractorProject
  contractorId: string
}) {
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date()
  const isDueSoon =
    project.dueDate &&
    new Date(project.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  const needsAdminAction = ['submitted', 'withdrawal_requested'].includes(project.status)

  return (
    <Card className={needsAdminAction ? 'border-yellow-500/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/admin/contractors/${contractorId}/projects/${project.id}`}
            className="font-medium hover:underline"
          >
            {project.title}
          </Link>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {project.description && (
          <p className="line-clamp-2 text-muted-foreground">{project.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          {project.dueDate && (
            <span
              className={
                isOverdue
                  ? 'text-destructive'
                  : isDueSoon
                    ? 'text-yellow-600'
                    : ''
              }
            >
              <Clock className="mr-1 inline h-3 w-3" />
              {formatDate(project.dueDate)}
            </span>
          )}
          {project.rateCents && (
            <span>
              <DollarSign className="mr-1 inline h-3 w-3" />
              {formatMoney(project.rateCents)}
            </span>
          )}
        </div>

        {project.deliverables.length > 0 && (
          <div className="pt-1">
            <span className="text-xs text-muted-foreground">
              {project.deliverables.filter((d) => d.completed).length}/{project.deliverables.length} deliverables completed
            </span>
          </div>
        )}

        {needsAdminAction && (
          <div className="pt-2">
            <Link
              href={`/admin/contractors/${contractorId}/projects/${project.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Review {project.status === 'submitted' ? 'submission' : 'payout request'} &rarr;
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
