import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

// Simple cron field parser for preview — handles standard 5-field cron expressions
function parseCronField(field: string, min: number, max: number): number[] {
  const values: number[] = []

  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/)
    const step = stepMatch ? parseInt(stepMatch[2]!) : 1
    const range = stepMatch ? stepMatch[1]! : part

    if (range === '*') {
      for (let i = min; i <= max; i += step) values.push(i)
    } else if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number)
      for (let i = start!; i <= end!; i += step) values.push(i)
    } else {
      values.push(parseInt(range))
    }
  }

  return values.filter((v) => v >= min && v <= max)
}

function getNextRuns(cron: string, count: number): Date[] {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return []

  const minutes = parseCronField(parts[0]!, 0, 59)
  const hours = parseCronField(parts[1]!, 0, 23)
  const doms = parseCronField(parts[2]!, 1, 31)
  const months = parseCronField(parts[3]!, 1, 12)
  const dows = parseCronField(parts[4]!, 0, 6)

  const domWildcard = parts[2] === '*'
  const dowWildcard = parts[4] === '*'

  const results: Date[] = []
  const now = new Date()
  const cursor = new Date(now)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const maxIterations = 525_960 // ~1 year of minutes
  for (let i = 0; i < maxIterations && results.length < count; i++) {
    const m = cursor.getMinutes()
    const h = cursor.getHours()
    const dom = cursor.getDate()
    const month = cursor.getMonth() + 1
    const dow = cursor.getDay()

    const minuteMatch = minutes.includes(m)
    const hourMatch = hours.includes(h)
    const monthMatch = months.includes(month)

    // DOM and DOW: if both specified, either can match (OR logic per cron standard)
    let dayMatch: boolean
    if (domWildcard && dowWildcard) {
      dayMatch = true
    } else if (domWildcard) {
      dayMatch = dows.includes(dow)
    } else if (dowWildcard) {
      dayMatch = doms.includes(dom)
    } else {
      dayMatch = doms.includes(dom) || dows.includes(dow)
    }

    if (minuteMatch && hourMatch && dayMatch && monthMatch) {
      results.push(new Date(cursor))
    }

    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  return results
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const url = new URL(request.url)
  const cron = url.searchParams.get('cron')

  if (!cron) {
    return Response.json({ error: 'cron parameter required' }, { status: 400 })
  }

  const runs = getNextRuns(cron, 5)

  return Response.json({
    cron,
    nextRuns: runs.map((d) =>
      d.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    ),
  })
}
