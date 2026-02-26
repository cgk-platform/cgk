import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

interface ContainerInfo {
  id: string
  name: string
  status: string
  state: string
  image: string
  created: string
  ports: string
  profile: string
}

interface ContainerStats {
  containerId: string
  cpuPerc: string
  memUsage: string
  memPerc: string
  netIO: string
}

function deriveProfile(name: string): string {
  if (name.includes('sbx-cgk') || name.includes('sbx-main')) return 'cgk'
  if (name.includes('sbx-rawdog')) return 'rawdog'
  if (name.includes('sbx-vita')) return 'vitahustle'
  return 'unknown'
}

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    // Get container list
    let containersRaw = ''
    try {
      containersRaw = execSync(
        'docker ps --filter "name=openclaw-sbx" --format "{{json .}}"',
        { timeout: 10_000, encoding: 'utf8' }
      )
    } catch {
      return Response.json({ containers: [], stats: [] })
    }

    const containers: ContainerInfo[] = containersRaw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const raw = JSON.parse(line) as Record<string, string>
        return {
          id: raw.ID || '',
          name: raw.Names || '',
          status: raw.Status || '',
          state: raw.State || '',
          image: raw.Image || '',
          created: raw.CreatedAt || raw.RunningFor || '',
          ports: raw.Ports || '',
          profile: deriveProfile(raw.Names || ''),
        }
      })

    // Get stats
    let statsRaw = ''
    const stats: ContainerStats[] = []
    if (containers.length > 0) {
      try {
        statsRaw = execSync(
          'docker stats --no-stream --filter "name=openclaw-sbx" --format "{{json .}}"',
          { timeout: 10_000, encoding: 'utf8' }
        )
        for (const line of statsRaw.trim().split('\n').filter(Boolean)) {
          const raw = JSON.parse(line) as Record<string, string>
          stats.push({
            containerId: raw.ID || raw.Container || '',
            cpuPerc: raw.CPUPerc || '0%',
            memUsage: raw.MemUsage || '',
            memPerc: raw.MemPerc || '0%',
            netIO: raw.NetIO || '',
          })
        }
      } catch {
        // stats optional
      }
    }

    return Response.json({ containers, stats })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to query Docker' },
      { status: 502 }
    )
  }
}
