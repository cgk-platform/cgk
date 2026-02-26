import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'
import { WORKSPACE_ROOTS } from '@/lib/state-dirs'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const result = validateProfileParam(await params)
  if ('error' in result) return result.error

  const workspace = WORKSPACE_ROOTS[result.profile]
  const memoryDir = join(workspace, 'memory')

  try {
    // Read MEMORY.md from workspace root
    let memoryMd = ''
    try {
      memoryMd = await readFile(join(workspace, 'MEMORY.md'), 'utf8')
    } catch {
      // no MEMORY.md
    }

    // List daily memory files
    const dailyFiles: Array<{ date: string; size: number }> = []
    try {
      const entries = await readdir(memoryDir)
      const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/
      for (const entry of entries) {
        if (datePattern.test(entry)) {
          try {
            const info = await stat(join(memoryDir, entry))
            dailyFiles.push({
              date: entry.replace('.md', ''),
              size: info.size,
            })
          } catch {
            // skip unreadable files
          }
        }
      }
      dailyFiles.sort((a, b) => b.date.localeCompare(a.date))
    } catch {
      // memory dir may not exist
    }

    // List active tasks
    const activeTasks: Array<{ name: string }> = []
    try {
      const tasksDir = join(memoryDir, 'active-tasks.d')
      const taskEntries = await readdir(tasksDir)
      for (const entry of taskEntries) {
        if (entry.endsWith('.json') || entry.endsWith('.md')) {
          activeTasks.push({ name: entry })
        }
      }
    } catch {
      // no active-tasks.d
    }

    // Read specific date if requested
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    let dailyContent = ''
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      try {
        dailyContent = await readFile(join(memoryDir, `${date}.md`), 'utf8')
      } catch {
        // file doesn't exist
      }
    }

    // Read specific active task if requested
    const taskName = url.searchParams.get('task')
    let taskContent = ''
    if (taskName) {
      try {
        taskContent = await readFile(
          join(memoryDir, 'active-tasks.d', taskName),
          'utf8'
        )
      } catch {
        // task doesn't exist
      }
    }

    return Response.json({
      memoryMd,
      dailyFiles,
      activeTasks,
      dailyContent,
      taskContent,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to read memory' },
      { status: 502 }
    )
  }
}
