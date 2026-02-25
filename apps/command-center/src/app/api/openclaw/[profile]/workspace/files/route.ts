import { readdir, stat } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

const WORKSPACE_ROOTS: Record<string, string> = {
  cgk: '/Users/novarussell/.openclaw/workspace',
  rawdog: '/Users/novarussell/.openclaw-rawdog/workspace',
  vitahustle: '/Users/novarussell/.openclaw-vitahustle/workspace',
}

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
}

async function listDir(base: string, rel: string): Promise<FileEntry[]> {
  const dir = join(base, rel)
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const results: FileEntry[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const entryPath = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        results.push({ name: entry.name, path: entryPath, isDir: true })
      } else if (/\.(md|json|txt|yaml|yml|toml|sh|py|ts|js)$/i.test(entry.name)) {
        const s = await stat(join(dir, entry.name))
        results.push({ name: entry.name, path: entryPath, isDir: false, size: s.size })
      }
    }
    return results.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
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

  const root = WORKSPACE_ROOTS[result.profile]
  if (!root) {
    return Response.json({ error: 'Unknown profile' }, { status: 400 })
  }

  const url = new URL(request.url)
  const dir = url.searchParams.get('dir') || ''

  // Path traversal protection
  if (dir.includes('..') || dir.startsWith('/')) {
    return Response.json({ error: 'Invalid path' }, { status: 400 })
  }

  const files = await listDir(root, dir)
  return Response.json({ files, dir })
}
