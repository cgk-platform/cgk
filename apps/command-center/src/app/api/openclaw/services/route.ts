import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  detail?: string
}

async function checkHttp(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

async function checkLiteLLM(): Promise<ServiceStatus> {
  const ok = await checkHttp('http://127.0.0.1:4000/health')
  return {
    name: 'LiteLLM',
    status: ok ? 'healthy' : 'down',
    detail: ok ? 'Port 4000' : 'Unreachable on :4000',
  }
}

async function checkOllama(): Promise<ServiceStatus> {
  const ok = await checkHttp('http://127.0.0.1:11434/api/tags')
  return {
    name: 'Ollama',
    status: ok ? 'healthy' : 'down',
    detail: ok ? 'Port 11434' : 'Unreachable on :11434',
  }
}

async function checkOrbStack(): Promise<ServiceStatus> {
  try {
    const { stdout } = await execAsync('orbctl status', { timeout: 5000 })
    const running = stdout.toLowerCase().includes('running')
    return {
      name: 'OrbStack',
      status: running ? 'healthy' : 'down',
      detail: stdout.trim().split('\n')[0] || 'Unknown',
    }
  } catch {
    return { name: 'OrbStack', status: 'down', detail: 'orbctl not available' }
  }
}

async function checkDockerContainers(): Promise<ServiceStatus> {
  try {
    const { stdout } = await execAsync(
      'docker ps --filter "name=openclaw-sbx" --format "{{.Names}}"',
      { timeout: 5000 }
    )
    const containers = stdout.trim().split('\n').filter(Boolean)
    return {
      name: 'Docker Sandbox',
      status: containers.length > 0 ? 'healthy' : 'degraded',
      detail: containers.length > 0
        ? `${containers.length} container${containers.length === 1 ? '' : 's'} running`
        : 'No sandbox containers',
    }
  } catch {
    return { name: 'Docker Sandbox', status: 'down', detail: 'Docker unreachable' }
  }
}

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get('x-is-super-admin') !== 'true') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const results = await Promise.allSettled([
    checkLiteLLM(),
    checkOllama(),
    checkOrbStack(),
    checkDockerContainers(),
  ])

  const services: ServiceStatus[] = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: 'Unknown', status: 'unknown' as const, detail: 'Check failed' }
  )

  return Response.json({ services })
}
