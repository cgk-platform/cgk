import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'
import { STATE_DIRS } from '@/lib/state-dirs'

export const dynamic = 'force-dynamic'

interface CronJobDef {
  id: string
  agentId?: string
  name: string
  enabled: boolean
  notify?: boolean
  schedule: {
    kind: string
    cron?: string
    everyMs?: number
    tz?: string
  }
  sessionTarget: string
  delivery: {
    mode: string
    channel?: string
    to?: string
    threadId?: string
  }
  payload?: { message: string }
  timeout?: number
  maxConcurrentRuns?: number
}

interface JobsFile {
  jobs: CronJobDef[]
}

interface ValidationError {
  field: string
  message: string
}

function validateJob(job: Partial<CronJobDef>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!job.name?.trim()) {
    errors.push({ field: 'name', message: 'Job name is required' })
  }

  if (job.sessionTarget && job.sessionTarget !== 'isolated') {
    errors.push({
      field: 'sessionTarget',
      message: 'sessionTarget must be "isolated" (CLAUDE.md safety rule)',
    })
  }

  if (job.schedule?.tz && job.schedule.tz !== 'America/Los_Angeles') {
    errors.push({
      field: 'schedule.tz',
      message: 'Timezone must be "America/Los_Angeles" (CLAUDE.md safety rule)',
    })
  }

  if (job.delivery?.mode === 'announce' && !job.delivery.channel) {
    errors.push({
      field: 'delivery.channel',
      message: 'Channel is required for announce delivery mode',
    })
  }

  if (job.delivery?.mode === 'none' && !job.delivery.channel) {
    errors.push({
      field: 'delivery',
      message: 'delivery.mode "none" without explicit channel is not allowed (CLAUDE.md safety rule)',
    })
  }

  if (job.schedule?.kind === 'cron' && !job.schedule.cron) {
    errors.push({ field: 'schedule.cron', message: 'Cron expression is required' })
  }

  if (job.schedule?.kind === 'every' && !job.schedule.everyMs) {
    errors.push({ field: 'schedule.everyMs', message: 'Interval is required' })
  }

  return errors
}

async function readJobsFile(profile: string): Promise<JobsFile> {
  const p = join(STATE_DIRS[profile as keyof typeof STATE_DIRS], 'cron', 'jobs.json')
  const content = await readFile(p, 'utf8')
  return JSON.parse(content) as JobsFile
}

async function writeJobsFile(profile: string, data: JobsFile): Promise<void> {
  const p = join(STATE_DIRS[profile as keyof typeof STATE_DIRS], 'cron', 'jobs.json')
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

// POST — Create job
export async function POST(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const body = await request.json() as Partial<CronJobDef>

  // Force safety defaults
  body.sessionTarget = 'isolated'
  if (!body.schedule) body.schedule = { kind: 'cron' }
  body.schedule.tz = 'America/Los_Angeles'

  const errors = validateJob(body)
  if (errors.length > 0) {
    return Response.json({ error: 'Validation failed', errors }, { status: 400 })
  }

  try {
    const jobsFile = await readJobsFile(result.profile)

    const newJob: CronJobDef = {
      id: body.id || `job-${Date.now()}`,
      agentId: body.agentId || 'main',
      name: body.name!,
      enabled: body.enabled ?? false,
      notify: body.notify ?? false,
      schedule: body.schedule,
      sessionTarget: 'isolated',
      delivery: body.delivery || { mode: 'none' },
      payload: body.payload,
      timeout: body.timeout,
      maxConcurrentRuns: body.maxConcurrentRuns ?? 1,
    }

    jobsFile.jobs.push(newJob)
    await writeJobsFile(result.profile, jobsFile)

    return Response.json({ ok: true, job: newJob, requiresRestart: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to create job' },
      { status: 502 }
    )
  }
}

// PUT — Update job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const body = await request.json() as Partial<CronJobDef> & { id: string }

  if (!body.id) {
    return Response.json({ error: 'Job ID required' }, { status: 400 })
  }

  // Force safety defaults
  body.sessionTarget = 'isolated'
  if (body.schedule) body.schedule.tz = 'America/Los_Angeles'

  const errors = validateJob(body)
  if (errors.length > 0) {
    return Response.json({ error: 'Validation failed', errors }, { status: 400 })
  }

  try {
    const jobsFile = await readJobsFile(result.profile)
    const idx = jobsFile.jobs.findIndex((j) => j.id === body.id)
    if (idx === -1) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    const existing = jobsFile.jobs[idx]!
    jobsFile.jobs[idx] = {
      ...existing,
      ...body,
      sessionTarget: 'isolated',
      schedule: { ...existing.schedule, ...body.schedule, tz: 'America/Los_Angeles' },
    }

    await writeJobsFile(result.profile, jobsFile)

    return Response.json({ ok: true, job: jobsFile.jobs[idx], requiresRestart: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to update job' },
      { status: 502 }
    )
  }
}

// DELETE — Delete job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const url = new URL(request.url)
  const jobId = url.searchParams.get('id')

  if (!jobId) {
    return Response.json({ error: 'Job ID required' }, { status: 400 })
  }

  try {
    const jobsFile = await readJobsFile(result.profile)
    const idx = jobsFile.jobs.findIndex((j) => j.id === jobId)
    if (idx === -1) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    jobsFile.jobs.splice(idx, 1)
    await writeJobsFile(result.profile, jobsFile)

    return Response.json({ ok: true, requiresRestart: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to delete job' },
      { status: 502 }
    )
  }
}
