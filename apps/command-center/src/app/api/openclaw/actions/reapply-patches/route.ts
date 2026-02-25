import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

const PATCH_SCRIPTS = [
  'bash ~/.openclaw/patches/apply-debouncer-fix.sh',
  'bash ~/.openclaw/patches/apply-callid-fix.sh',
  'bash ~/.openclaw/patches/apply-sandbox-bind-fix.sh',
  'bash ~/.openclaw/patches/apply-sandbox-fs-fix.sh',
  'bash ~/.openclaw/patches/apply-announce-timeout-fix.sh',
]

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const results: Array<{ script: string; ok: boolean; stdout: string; error?: string }> = []

  for (const script of PATCH_SCRIPTS) {
    try {
      const { stdout } = await execAsync(script, { timeout: 15_000 })
      results.push({ script, ok: true, stdout: stdout.trim() })
    } catch (err) {
      results.push({
        script,
        ok: false,
        stdout: '',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const allOk = results.every((r) => r.ok)
  return Response.json({ ok: allOk, results })
}
