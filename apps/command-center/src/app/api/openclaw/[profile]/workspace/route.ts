import { readFile, stat } from 'fs/promises'
import { join } from 'path'

import { validateProfileParam } from '@/lib/profile-param'

export const dynamic = 'force-dynamic'

const WORKSPACE_ROOTS: Record<string, string> = {
  cgk: '/Users/novarussell/.openclaw/workspace',
  rawdog: '/Users/novarussell/.openclaw-rawdog/workspace',
  vitahustle: '/Users/novarussell/.openclaw-vitahustle/workspace',
}

const ALLOWED_EXTENSIONS = /\.(md|json|txt|yaml|yml|toml|sh|py|ts|js)$/i
const MAX_FILE_SIZE = 1024 * 1024 // 1MB

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
  const filePath = url.searchParams.get('path')
  if (!filePath) {
    return Response.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  // Path traversal protection
  if (filePath.includes('..') || filePath.startsWith('/')) {
    return Response.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Extension whitelist
  if (!ALLOWED_EXTENSIONS.test(filePath)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 })
  }

  try {
    const fullPath = join(root, filePath)
    // Verify resolved path is still under workspace root
    if (!fullPath.startsWith(root)) {
      return Response.json({ error: 'Path traversal detected' }, { status: 400 })
    }

    const s = await stat(fullPath)
    if (s.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'File too large' }, { status: 413 })
    }
    const content = await readFile(fullPath, 'utf-8')

    return Response.json({ path: filePath, content })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }
    return Response.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
