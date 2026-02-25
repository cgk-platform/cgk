import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'

import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

const MEDIA_ROOTS: Record<string, string> = {
  cgk: '/Users/novarussell/.openclaw/media',
  rawdog: '/Users/novarussell/.openclaw-rawdog/media',
  vitahustle: '/Users/novarussell/.openclaw-vitahustle/media',
}

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
}

const ALLOWED_EXTENSIONS = new Set(Object.keys(CONTENT_TYPES))

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profile: string; filename: string }> }
): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { profile, filename } = await params
  const result = validateProfileParam({ profile })
  if ('error' in result) return result.error

  const root = MEDIA_ROOTS[result.profile]
  if (!root) {
    return Response.json({ error: 'Unknown profile' }, { status: 400 })
  }

  // Security: no path separators, no directory traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return Response.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const ext = getExtension(filename)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const fullPath = join(root, filename)
  // Double-check resolved path is under media root
  if (!fullPath.startsWith(root)) {
    return Response.json({ error: 'Path traversal detected' }, { status: 400 })
  }

  try {
    const s = await stat(fullPath)
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    // Stream the file instead of reading entirely into memory
    const nodeStream = createReadStream(fullPath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(s.size),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }
    return Response.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
