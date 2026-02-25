import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    // Stop running sandbox containers
    const stopResult = await execAsync(
      'docker stop $(docker ps -q --filter "name=openclaw-sbx") 2>/dev/null; true',
      { timeout: 30_000 }
    )

    // Remove stopped sandbox containers
    const rmResult = await execAsync(
      'docker rm $(docker ps -aq --filter "name=openclaw-sbx") 2>/dev/null; true',
      { timeout: 15_000 }
    )

    return Response.json({
      ok: true,
      stdout: [stopResult.stdout, rmResult.stdout].filter(Boolean).join('\n').trim() || 'No containers to prune',
    })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to prune' },
      { status: 500 }
    )
  }
}
