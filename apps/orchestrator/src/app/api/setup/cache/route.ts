import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/cache
 *
 * Tests the cache/KV connection.
 */
export async function POST() {
  try {
    const kvUrl = process.env.KV_REST_API_URL
    const kvToken = process.env.KV_REST_API_TOKEN
    const redisUrl = process.env.REDIS_URL

    if (!kvUrl && !redisUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'No cache URL configured. Set KV_REST_API_URL or REDIS_URL.',
        },
        { status: 400 }
      )
    }

    // Test Vercel KV connection
    if (kvUrl && kvToken) {
      const testKey = `setup-test-${Date.now()}`

      // Try to set a test value
      const setResponse = await fetch(`${kvUrl}/set/${testKey}/test-value/ex/10`, {
        headers: {
          Authorization: `Bearer ${kvToken}`,
        },
      })

      if (!setResponse.ok) {
        throw new Error(`KV set failed: ${setResponse.statusText}`)
      }

      // Try to get the test value
      const getResponse = await fetch(`${kvUrl}/get/${testKey}`, {
        headers: {
          Authorization: `Bearer ${kvToken}`,
        },
      })

      if (!getResponse.ok) {
        throw new Error(`KV get failed: ${getResponse.statusText}`)
      }

      // Parse the URL for display
      let displayUrl = kvUrl
      try {
        const url = new URL(kvUrl)
        displayUrl = `${url.hostname}`
      } catch {
        // Keep original
      }

      return NextResponse.json({
        success: true,
        cacheInfo: {
          type: 'Vercel KV',
          url: displayUrl,
        },
      })
    }

    // Test Redis connection (basic URL check for now)
    if (redisUrl) {
      let displayUrl = redisUrl
      try {
        const url = new URL(redisUrl)
        displayUrl = `${url.hostname}:${url.port || 6379}`
      } catch {
        // Keep original
      }

      // Note: Full Redis connection test would require a Redis client
      // For now, we just verify the URL is configured
      return NextResponse.json({
        success: true,
        cacheInfo: {
          type: 'Redis',
          url: displayUrl,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Cache configuration incomplete',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Cache connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 400 }
    )
  }
}
