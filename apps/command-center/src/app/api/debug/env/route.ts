export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const openclawVars = Object.keys(process.env)
    .filter((k) => k.startsWith('OPENCLAW'))
    .map((k) => `${k}=${(process.env[k] || '').substring(0, 10)}...`)

  const vercelVars = Object.keys(process.env)
    .filter((k) => k.startsWith('VERCEL'))
    .map((k) => `${k}=${(process.env[k] || '').substring(0, 30)}`)

  return Response.json({
    runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
    isVercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'local',
    env: process.env.VERCEL_ENV || 'local',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'none',
    nodeVersion: process.version,
    openclawVars,
    vercelVars: vercelVars.slice(0, 10),
    allEnvKeyCount: Object.keys(process.env).length,
  })
}

declare const EdgeRuntime: string | undefined
