import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const VALID_PROFILES = new Set(['cgk', 'rawdog', 'vitahustle'])

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const profile = body.profile as string | undefined

    if (profile && !VALID_PROFILES.has(profile)) {
      return Response.json({ error: 'Invalid profile' }, { status: 400 })
    }

    let cmd = 'openclaw doctor'
    if (profile && profile !== 'cgk') {
      cmd = `openclaw --profile ${profile} doctor`
    }

    const { stdout, stderr } = await execAsync(cmd, { timeout: 30_000 })
    return Response.json({ ok: true, stdout, stderr })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run doctor'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
