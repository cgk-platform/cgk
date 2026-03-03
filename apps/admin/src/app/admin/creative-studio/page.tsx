import { withTenant, sql } from '@cgk-platform/db'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { ProjectListClient } from './project-list-client'

export default async function CreativeStudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectListContent params={params} />
      </Suspense>
    </div>
  )
}

async function ProjectListContent({
  params,
}: {
  params: Record<string, string | string[] | undefined>
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No tenant configured.</p>
      </div>
    )
  }

  const statusFilter = (params.status as string) || ''
  const search = (params.search as string) || ''
  const page = Math.max(1, parseInt((params.page as string) || '1', 10))
  const limit = 20
  const offset = (page - 1) * limit

  const { projects, totalCount } = await withTenant(tenantSlug, async () => {
    let rows: unknown[]
    let count = 0

    if (statusFilter && search) {
      const [result, countResult] = await Promise.all([
        sql`
          SELECT p.*,
            (SELECT COUNT(*) FROM video_editor_scenes s WHERE s.project_id = p.id) AS scene_count,
            (SELECT rendered_at FROM video_editor_renders r WHERE r.project_id = p.id ORDER BY r.rendered_at DESC LIMIT 1) AS last_render_at
          FROM video_editor_projects p
          WHERE p.tenant_id = ${tenantSlug}
            AND p.status = ${statusFilter}
            AND p.title ILIKE ${'%' + search + '%'}
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) AS total FROM video_editor_projects
          WHERE tenant_id = ${tenantSlug} AND status = ${statusFilter}
            AND title ILIKE ${'%' + search + '%'}
        `,
      ])
      rows = result.rows
      count = parseInt(
        ((countResult.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0',
        10
      )
    } else if (statusFilter) {
      const [result, countResult] = await Promise.all([
        sql`
          SELECT p.*,
            (SELECT COUNT(*) FROM video_editor_scenes s WHERE s.project_id = p.id) AS scene_count,
            (SELECT rendered_at FROM video_editor_renders r WHERE r.project_id = p.id ORDER BY r.rendered_at DESC LIMIT 1) AS last_render_at
          FROM video_editor_projects p
          WHERE p.tenant_id = ${tenantSlug}
            AND p.status = ${statusFilter}
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) AS total FROM video_editor_projects
          WHERE tenant_id = ${tenantSlug} AND status = ${statusFilter}
        `,
      ])
      rows = result.rows
      count = parseInt(
        ((countResult.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0',
        10
      )
    } else if (search) {
      const [result, countResult] = await Promise.all([
        sql`
          SELECT p.*,
            (SELECT COUNT(*) FROM video_editor_scenes s WHERE s.project_id = p.id) AS scene_count,
            (SELECT rendered_at FROM video_editor_renders r WHERE r.project_id = p.id ORDER BY r.rendered_at DESC LIMIT 1) AS last_render_at
          FROM video_editor_projects p
          WHERE p.tenant_id = ${tenantSlug}
            AND p.title ILIKE ${'%' + search + '%'}
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) AS total FROM video_editor_projects
          WHERE tenant_id = ${tenantSlug} AND title ILIKE ${'%' + search + '%'}
        `,
      ])
      rows = result.rows
      count = parseInt(
        ((countResult.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0',
        10
      )
    } else {
      const [result, countResult] = await Promise.all([
        sql`
          SELECT p.*,
            (SELECT COUNT(*) FROM video_editor_scenes s WHERE s.project_id = p.id) AS scene_count,
            (SELECT rendered_at FROM video_editor_renders r WHERE r.project_id = p.id ORDER BY r.rendered_at DESC LIMIT 1) AS last_render_at
          FROM video_editor_projects p
          WHERE p.tenant_id = ${tenantSlug}
          ORDER BY p.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) AS total FROM video_editor_projects
          WHERE tenant_id = ${tenantSlug}
        `,
      ])
      rows = result.rows
      count = parseInt(
        ((countResult.rows[0] as Record<string, unknown>)?.['total'] as string) ?? '0',
        10
      )
    }

    return { projects: rows, totalCount: count }
  })

  return (
    <ProjectListClient
      projects={projects as ProjectRow[]}
      search={search}
      statusFilter={statusFilter}
      page={page}
      totalCount={totalCount}
      pageSize={limit}
    />
  )
}

export interface ProjectRow {
  id: string
  title: string
  status: string
  mode: string | null
  aspect_ratio: string | null
  template_id: string | null
  render_url: string | null
  voice_name: string | null
  caption_style: string | null
  scene_count: string | null
  last_render_at: string | null
  created_at: string
  updated_at: string
}

function ProjectListSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="space-y-2">
          <div className="h-6 w-44 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 animate-pulse rounded-md bg-slate-800" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-slate-800" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-slate-800" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="aspect-video animate-pulse bg-slate-800" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
