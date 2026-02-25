export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const allKeys = Object.keys(process.env).sort()

  const openclawVars = allKeys
    .filter((k) => k.startsWith('OPENCLAW'))
    .map((k) => `${k}=${(process.env[k] || '').substring(0, 10)}...`)

  // Check which project env vars are present (just boolean, no values)
  const projectVarCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    REDIS_URL: !!process.env.REDIS_URL,
    OPENCLAW_CGK_URL: !!process.env.OPENCLAW_CGK_URL,
    OPENCLAW_CGK_GATEWAY_TOKEN: !!process.env.OPENCLAW_CGK_GATEWAY_TOKEN,
    OPENCLAW_RAWDOG_URL: !!process.env.OPENCLAW_RAWDOG_URL,
    OPENCLAW_VITA_URL: !!process.env.OPENCLAW_VITA_URL,
  }

  // Show non-VERCEL, non-system keys to see what custom vars exist
  const customKeys = allKeys.filter(
    (k) =>
      !k.startsWith('VERCEL') &&
      !k.startsWith('__') &&
      !k.startsWith('npm_') &&
      !['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'TERM', 'NODE', 'HOSTNAME', 'PWD', 'SHLVL', 'OLDPWD', 'TMPDIR', 'TZ', 'AWS_REGION', 'AWS_DEFAULT_REGION', 'AWS_EXECUTION_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'AWS_LAMBDA_FUNCTION_VERSION', 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE', 'AWS_LAMBDA_LOG_GROUP_NAME', 'AWS_LAMBDA_LOG_STREAM_NAME', 'AWS_LAMBDA_RUNTIME_API', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'LAMBDA_TASK_ROOT', 'LAMBDA_RUNTIME_DIR', '_HANDLER', 'NODE_PATH', 'NODE_EXTRA_CA_CERTS', 'LD_LIBRARY_PATH'].includes(k)
  )

  return Response.json({
    runtime: typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node',
    isVercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'local',
    env: process.env.VERCEL_ENV || 'local',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || 'none',
    nodeVersion: process.version,
    projectVarCheck,
    openclawVars,
    customKeys,
    allEnvKeyCount: allKeys.length,
  })
}

declare const EdgeRuntime: string | undefined
