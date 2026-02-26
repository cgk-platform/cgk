import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'
import { WORKSPACE_ROOTS } from '@/lib/state-dirs'

export const dynamic = 'force-dynamic'

interface SearchMatch {
  line: number
  text: string
}

interface SearchResult {
  date: string
  matches: SearchMatch[]
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
  const query = url.searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return Response.json({ results: [] })
  }

  const memoryDir = join(WORKSPACE_ROOTS[result.profile], 'memory')
  const results: SearchResult[] = []
  const queryLower = query.toLowerCase()

  try {
    const entries = await readdir(memoryDir)
    const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/
    const dateFiles = entries
      .filter((e) => datePattern.test(e))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 90) // Cap at 90 most recent

    const startTime = Date.now()

    for (const file of dateFiles) {
      if (Date.now() - startTime > 5000) break // 5s timeout

      try {
        const content = await readFile(join(memoryDir, file), 'utf8')
        const lines = content.split('\n')
        const matches: SearchMatch[] = []

        for (let i = 0; i < lines.length; i++) {
          if (lines[i]!.toLowerCase().includes(queryLower)) {
            matches.push({ line: i + 1, text: lines[i]! })
          }
        }

        if (matches.length > 0) {
          results.push({
            date: file.replace('.md', ''),
            matches: matches.slice(0, 10), // Cap matches per file
          })
        }
      } catch {
        // skip unreadable
      }
    }

    return Response.json({ results })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 502 }
    )
  }
}
