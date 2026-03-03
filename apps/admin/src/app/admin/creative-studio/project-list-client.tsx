'use client'

import { useState } from 'react'
import { Badge, Button, Card, Input } from '@cgk-platform/ui'
import { ChevronLeft, ChevronRight, Clapperboard, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { ProjectRow } from './page'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  storyboarding: 'bg-blue-500/20 text-blue-400',
  producing: 'bg-amber-500/20 text-amber-400',
  rendering: 'bg-purple-500/20 text-purple-400',
  rendered: 'bg-emerald-500/20 text-emerald-400',
  delivered: 'bg-green-500/20 text-green-400',
  archived: 'bg-slate-600/20 text-slate-400',
}

const STATUS_OPTIONS = [
  'draft',
  'storyboarding',
  'producing',
  'rendering',
  'rendered',
  'delivered',
  'archived',
]

interface ProjectListClientProps {
  projects: ProjectRow[]
  search: string
  statusFilter: string
  page: number
  totalCount: number
  pageSize: number
}

export function ProjectListClient({
  projects,
  search,
  statusFilter,
  page,
  totalCount,
  pageSize,
}: ProjectListClientProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const buildUrl = (overrides: { search?: string; status?: string; page?: number }) => {
    const params = new URLSearchParams()
    const s = overrides.search ?? searchValue
    const st = overrides.status ?? statusFilter
    const p = overrides.page ?? 1
    if (s) params.set('search', s)
    if (st) params.set('status', st)
    if (p > 1) params.set('page', String(p))
    return `/admin/creative-studio?${params.toString()}`
  }

  const handleSearch = () => {
    router.push(buildUrl({ search: searchValue, page: 1 }))
  }

  const handleStatusChange = (value: string) => {
    router.push(buildUrl({ status: value, page: 1 }))
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Creative Studio</h1>
          <p className="text-sm text-slate-400">{totalCount} projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search projects..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64 border-slate-700 bg-slate-800 pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-600"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          {(search || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/creative-studio')}
              className="text-slate-400 hover:text-slate-200"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Clapperboard className="mb-3 h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No projects yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Projects are created by the video editor agent
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-800 px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(buildUrl({ page: page - 1 }))}
            className="border-slate-700 text-slate-300"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(buildUrl({ page: page + 1 }))}
            className="border-slate-700 text-slate-300"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
}

function ProjectCard({ project }: { project: ProjectRow }) {
  const statusClass = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft
  const sceneCount = project.scene_count ? parseInt(project.scene_count, 10) : 0

  const thumbUrl = project.render_url?.startsWith('http') ? project.render_url : null

  const lastRender = project.last_render_at
    ? new Date(project.last_render_at).toLocaleDateString()
    : null

  return (
    <Link href={`/admin/creative-studio/${project.id}`}>
      <Card className="group cursor-pointer overflow-hidden border-slate-800 bg-slate-900 p-0 transition-all hover:border-slate-600 hover:shadow-lg">
        <div className="relative aspect-video bg-slate-800">
          {thumbUrl ? (
            <video
              src={thumbUrl}
              muted
              preload="metadata"
              className="h-full w-full object-cover"
              onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
              onMouseOut={(e) => {
                const v = e.currentTarget as HTMLVideoElement
                v.pause()
                v.currentTime = 0
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Clapperboard className="h-8 w-8 text-slate-600" />
              {(project.status === 'rendered' || project.status === 'delivered') && (
                <span className="text-xs text-slate-500">Render available</span>
              )}
            </div>
          )}

          <div className="absolute left-2 top-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
            >
              {project.status}
            </span>
          </div>

          {project.aspect_ratio && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              {project.aspect_ratio}
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="truncate font-medium text-slate-200">{project.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {project.template_id && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {project.template_id}
              </Badge>
            )}
            {project.mode && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {project.mode}
              </Badge>
            )}
            {sceneCount > 0 && (
              <span className="text-[11px] text-slate-500">
                {sceneCount} scene{sceneCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {lastRender && (
            <p className="mt-1.5 text-[11px] text-slate-500">Last render: {lastRender}</p>
          )}
        </div>
      </Card>
    </Link>
  )
}
