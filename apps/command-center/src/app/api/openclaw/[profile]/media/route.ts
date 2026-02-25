import { readdir, stat } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

const MEDIA_ROOTS: Record<string, string> = {
  cgk: '/Users/novarussell/.openclaw/media',
  rawdog: '/Users/novarussell/.openclaw-rawdog/media',
  vitahustle: '/Users/novarussell/.openclaw-vitahustle/media',
}

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.mov'])

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

function getMediaType(ext: string): 'image' | 'video' {
  return ['.mp4', '.mov'].includes(ext) ? 'video' : 'image'
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

  const root = MEDIA_ROOTS[result.profile]
  if (!root) {
    return Response.json({ error: 'Unknown profile' }, { status: 400 })
  }

  const url = new URL(request.url)
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50))
  const typeFilter = url.searchParams.get('type') // 'image' | 'video' | null

  try {
    const entries = await readdir(root, { withFileTypes: true })

    const files: Array<{
      name: string
      type: 'image' | 'video'
      size: number
      mtime: string
    }> = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = getExtension(entry.name)
      if (!ALLOWED_EXTENSIONS.has(ext)) continue
      const mediaType = getMediaType(ext)
      if (typeFilter && mediaType !== typeFilter) continue

      // No path separators allowed in filename
      if (entry.name.includes('/') || entry.name.includes('\\')) continue

      const s = await stat(join(root, entry.name))
      files.push({
        name: entry.name,
        type: mediaType,
        size: s.size,
        mtime: s.mtime.toISOString(),
      })
    }

    // Sort newest first
    files.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())

    const paged = files.slice(offset, offset + limit)
    return Response.json({
      files: paged,
      total: files.length,
      hasMore: offset + limit < files.length,
      nextOffset: offset + limit,
    })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return Response.json({ files: [], total: 0, hasMore: false, nextOffset: 0 })
    }
    return Response.json({ error: 'Failed to list media' }, { status: 500 })
  }
}
