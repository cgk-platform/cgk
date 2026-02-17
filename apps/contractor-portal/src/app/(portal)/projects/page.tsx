'use client'

/**
 * Projects List Page
 *
 * Displays contractor projects in a Kanban board layout.
 */

import { Card, CardContent, cn, Badge } from '@cgk-platform/ui'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

import type { ContractorProject, KanbanColumnId } from '@/lib/types'
import { getStatusLabel, getStatusColor, KANBAN_COLUMNS } from '@/lib/types'

interface KanbanColumn {
  id: KanbanColumnId
  title: string
  color: string
}

const COLUMNS: KanbanColumn[] = [
  { id: 'upcoming', title: 'Upcoming', color: 'bg-gray-400' },
  { id: 'inProgress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'submitted', title: 'Submitted', color: 'bg-yellow-500' },
  { id: 'revisions', title: 'Revisions', color: 'bg-orange-500' },
  { id: 'approved', title: 'Approved', color: 'bg-emerald-500' },
  { id: 'payouts', title: 'Payouts', color: 'bg-purple-500' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Record<KanbanColumnId, ContractorProject[]>>({
    upcoming: [],
    inProgress: [],
    submitted: [],
    revisions: [],
    approved: [],
    payouts: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/contractor/projects')
        if (!response.ok) throw new Error('Failed to fetch projects')
        const data = await response.json()

        // Group by Kanban column
        const grouped: Record<KanbanColumnId, ContractorProject[]> = {
          upcoming: [],
          inProgress: [],
          submitted: [],
          revisions: [],
          approved: [],
          payouts: [],
        }

        for (const project of data.projects ?? []) {
          for (const [columnId, statuses] of Object.entries(KANBAN_COLUMNS)) {
            if ((statuses as readonly string[]).includes(project.status)) {
              grouped[columnId as KanbanColumnId].push(project)
              break
            }
          }
        }

        setProjects(grouped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalProjects = Object.values(projects).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {totalProjects} project{totalProjects !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            projects={projects[column.id]}
          />
        ))}
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  column: KanbanColumn
  projects: ContractorProject[]
}

function KanbanColumnComponent({ column, projects }: KanbanColumnProps) {
  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', column.color)} />
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {projects.length}
        </span>
      </div>

      {/* Column content */}
      <div className="flex-1 space-y-3 rounded-xl border bg-muted/30 p-3 min-h-[200px]">
        {projects.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            No projects
          </p>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: ContractorProject
}

function ProjectCard({ project }: ProjectCardProps) {
  const dueDate = project.dueDate ? new Date(project.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-all duration-normal hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {project.title}
          </h4>

          {project.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs', getStatusColor(project.status))}
            >
              {getStatusLabel(project.status)}
            </Badge>

            {dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {isOverdue ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {dueDate.toLocaleDateString()}
              </div>
            )}
          </div>

          {project.rateCents && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                ${(project.rateCents / 100).toFixed(2)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
