/**
 * MCP Server health monitor
 *
 * Checks MCP server connectivity with protocol handshake.
 */

import { evaluateLatencyHealth } from '../evaluator.js'
import type { HealthCheckResult, HealthMonitor } from '../types.js'

/**
 * MCP protocol response types
 */
interface MCPInitializeResponse {
  jsonrpc: '2.0'
  id: number
  result?: {
    protocolVersion: string
    serverInfo?: {
      name: string
      version: string
    }
    capabilities?: {
      tools?: { listChanged?: boolean }
      resources?: { listChanged?: boolean }
    }
  }
  error?: {
    code: number
    message: string
  }
}

/**
 * Check MCP server health
 */
export async function checkMCP(tenantId?: string): Promise<HealthCheckResult> {
  const startTime = Date.now()

  const mcpServerUrl = process.env.MCP_SERVER_URL
  if (!mcpServerUrl) {
    return {
      status: 'unhealthy' as const,
      latencyMs: 0,
      details: {},
      error: 'MCP_SERVER_URL environment variable is not configured',
    }
  }

  try {
    // Send MCP initialize request
    const response = await fetch(`${mcpServerUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId && { 'X-Tenant-ID': tenantId }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'health-check',
            version: '1.0.0',
          },
        },
      }),
    })

    const latencyMs = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: `MCP server returned ${response.status}`,
          statusCode: response.status,
          serverUrl: mcpServerUrl,
          ...(tenantId && { tenantId }),
        },
        error: `MCP server returned ${response.status}`,
      }
    }

    const result = (await response.json()) as MCPInitializeResponse

    // Check for JSON-RPC error
    if (result.error) {
      return {
        status: 'unhealthy',
        latencyMs,
        details: {
          error: result.error.message,
          errorCode: result.error.code,
          serverUrl: mcpServerUrl,
          ...(tenantId && { tenantId }),
        },
        error: result.error.message,
      }
    }

    const status = evaluateLatencyHealth(latencyMs, 500, 2000)

    return {
      status,
      latencyMs,
      details: {
        protocolVersion: result.result?.protocolVersion || 'unknown',
        serverName: result.result?.serverInfo?.name || 'unknown',
        serverVersion: result.result?.serverInfo?.version || 'unknown',
        hasToolsCapability: !!result.result?.capabilities?.tools,
        hasResourcesCapability: !!result.result?.capabilities?.resources,
        serverUrl: mcpServerUrl,
        ...(tenantId && { tenantId }),
      },
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Network errors in dev are expected if MCP server isn't running
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('connect'))

    if (isNetworkError && process.env.NODE_ENV === 'development') {
      return {
        status: 'unknown',
        latencyMs,
        details: {
          warning: 'MCP server not reachable (may be normal in dev)',
          serverUrl: mcpServerUrl,
          ...(tenantId && { tenantId }),
        },
      }
    }

    return {
      status: 'unhealthy',
      latencyMs,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        serverUrl: mcpServerUrl,
        ...(tenantId && { tenantId }),
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * MCP Server health monitor configuration
 */
export const mcpMonitor: HealthMonitor = {
  name: 'mcp',
  tier: 'integrations',
  check: checkMCP,
  requiresTenant: false,
}
