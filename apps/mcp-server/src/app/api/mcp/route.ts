/**
 * MCP API Route
 *
 * Dual-transport endpoint for Model Context Protocol requests.
 * Supports both:
 * - Streamable HTTP transport (POST-based, modern)
 * - SSE transport (GET+POST, for mcporter and legacy clients)
 *
 * @route GET  /api/mcp — SSE stream (opens session, sends endpoint event)
 * @route POST /api/mcp — JSON-RPC handler (returns response in body or via SSE)
 */

// Environment validation - must be imported first
import { ensureEnvValidated } from '@/lib/env-validation'

import {
  MCPHandler,
  MCPProtocolError,
  JSONRPCErrorCodes,
  defineResource,
  definePrompt,
  requiresStreaming,
  commerceTools,
  checkRateLimit,
  RateLimitError,
  createRateLimitResponse,
  addRateLimitHeaders,
  type JSONRPCRequest,
  type JSONRPCResponse,
  type InitializeParams,
  type CallToolParams,
  type ReadResourceParams,
  type GetPromptParams,
  type RateLimitResult,
} from '@cgk-platform/mcp'
import {
  authenticateRequest,
  createAuthErrorResponse,
  createCORSHeaders,
  MCPAuthError,
} from '@/lib/auth'
import {
  generateSessionId,
  registerSession,
  pushSessionMessage,
  popSessionMessages,
  isSSEBridgeAvailable,
} from '@/lib/sse-bridge'

// =============================================================================
// Edge Runtime Configuration
// =============================================================================

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// =============================================================================
// Server Configuration
// =============================================================================

const SERVER_NAME = 'cgk-mcp-server'
const SERVER_VERSION = '0.1.0'

// SSE polling interval in milliseconds
const SSE_POLL_INTERVAL_MS = 200
// SSE session timeout (close stream after this long with no activity)
const SSE_SESSION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// Commerce Tools - Real implementations with database queries
// =============================================================================

const exampleResources = [
  defineResource({
    uri: 'cgk://tenant/config',
    name: 'Tenant Configuration',
    description: 'Current tenant configuration',
    mimeType: 'application/json',
    async handler() {
      return {
        uri: 'cgk://tenant/config',
        mimeType: 'application/json',
        text: JSON.stringify({ placeholder: true }, null, 2),
      }
    },
  }),
]

const examplePrompts = [
  definePrompt({
    name: 'analyze_sales',
    description: 'Analyze sales data for the tenant',
    arguments: [
      { name: 'period', description: 'Time period (e.g., 7d, 30d)', required: false },
    ],
    async handler(args: Record<string, unknown>) {
      const period = (args.period as string) ?? '7d'
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze sales data for the last ${period}. Provide insights on trends, top products, and recommendations.`,
          },
        },
      ]
    },
  }),
]

// =============================================================================
// POST Handler — Streamable HTTP + SSE transport
// =============================================================================

export async function POST(request: Request): Promise<Response> {
  const corsHeaders = createCORSHeaders(request)
  let rateLimitResult: RateLimitResult | null = null

  try {
    ensureEnvValidated()

    const auth = await authenticateRequest(request)
    const body = await request.json()

    if (!isValidJSONRPCRequest(body)) {
      return createErrorResponse(
        null,
        JSONRPCErrorCodes.INVALID_REQUEST,
        'Invalid JSON-RPC request',
        corsHeaders
      )
    }

    const jsonrpcRequest = body as JSONRPCRequest

    // Rate limiting
    const skipRateLimitMethods = ['ping', 'tools/list', 'resources/list', 'prompts/list']
    if (!skipRateLimitMethods.includes(jsonrpcRequest.method)) {
      let toolName: string | undefined
      if (jsonrpcRequest.method === 'tools/call') {
        const toolParams = jsonrpcRequest.params as CallToolParams | undefined
        toolName = toolParams?.name
      }
      rateLimitResult = await checkRateLimit(auth.tenantId, jsonrpcRequest.method, toolName)
    }

    // Create handler with tenant/user context
    const handler = new MCPHandler(auth.tenantId, auth.userId, {
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        instructions:
          'CGK Commerce Platform MCP Server. Use tools to interact with commerce data.',
      },
      logUsage: true,
    })

    handler.registerTools(commerceTools)
    handler.registerResources(exampleResources)
    handler.registerPrompts(examplePrompts)

    // Process the request
    const response = await handleMethod(handler, jsonrpcRequest, corsHeaders, rateLimitResult)

    // Check if this is an SSE session POST (has sessionId query param)
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    if (sessionId && isSSEBridgeAvailable()) {
      // SSE transport: push response to Redis, return 202
      const responseBody = await response.text()
      await pushSessionMessage(sessionId, responseBody)

      return new Response(null, {
        status: 202,
        headers: corsHeaders,
      })
    }

    // Streamable HTTP transport: return response directly
    return response
  } catch (error) {
    if (error instanceof RateLimitError) {
      return createRateLimitResponse(error.result, corsHeaders)
    }
    if (error instanceof MCPAuthError) {
      return createAuthErrorResponse(error)
    }
    if (error instanceof MCPProtocolError) {
      return createErrorResponse(null, error.code, error.message, corsHeaders)
    }
    console.error('MCP request error:', error)
    return createErrorResponse(
      null,
      JSONRPCErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Internal server error',
      corsHeaders
    )
  }
}

// =============================================================================
// GET Handler — SSE transport session
// =============================================================================

/**
 * Opens an SSE stream for MCP SSE transport.
 *
 * Protocol:
 * 1. Client GETs this endpoint → receives SSE stream
 * 2. Server sends `endpoint` event with the POST URL (includes sessionId)
 * 3. Client POSTs JSON-RPC to that URL
 * 4. Server sends `message` events with JSON-RPC responses
 */
export async function GET(request: Request): Promise<Response> {
  const corsHeaders = createCORSHeaders(request)

  // If SSE bridge isn't configured, return server info JSON
  if (!isSSEBridgeAvailable()) {
    return new Response(
      JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        transport: 'streamable-http',
        endpoint: '/api/mcp',
        methods: ['POST'],
        note: 'SSE transport unavailable (KV not configured). Use POST for Streamable HTTP.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  try {
    // Authenticate
    await authenticateRequest(request)

    // Create session
    const sessionId = generateSessionId()
    await registerSession(sessionId)

    // Build the POST endpoint URL with session ID
    const url = new URL(request.url)
    const postEndpoint = `${url.origin}/api/mcp?sessionId=${sessionId}`

    // Create SSE stream
    const encoder = new TextEncoder()
    let closed = false
    const startTime = Date.now()

    const stream = new ReadableStream({
      async start(controller) {
        // Send the endpoint event (required by MCP SSE transport)
        controller.enqueue(
          encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`)
        )

        // Poll Redis for messages and forward to SSE stream
        const poll = async () => {
          while (!closed) {
            try {
              // Check session timeout
              if (Date.now() - startTime > SSE_SESSION_TIMEOUT_MS) {
                controller.close()
                closed = true
                return
              }

              // Poll for messages
              const messages = await popSessionMessages(sessionId)
              for (const msg of messages) {
                controller.enqueue(
                  encoder.encode(`event: message\ndata: ${msg}\n\n`)
                )
              }

              // Wait before next poll
              await new Promise((resolve) => setTimeout(resolve, SSE_POLL_INTERVAL_MS))
            } catch (error) {
              // If the stream was closed by the client, exit gracefully
              if (closed) return
              console.error('SSE poll error:', error)
              // Brief pause before retry
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          }
        }

        // Start polling (don't await — runs in background)
        poll().catch(() => {
          if (!closed) {
            try {
              controller.close()
            } catch {
              // Already closed
            }
          }
        })
      },
      cancel() {
        closed = true
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...corsHeaders,
      },
    })
  } catch (error) {
    if (error instanceof MCPAuthError) {
      return createAuthErrorResponse(error)
    }
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
}

// =============================================================================
// OPTIONS Handler — CORS preflight
// =============================================================================

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: createCORSHeaders(request),
  })
}

// =============================================================================
// Method Router
// =============================================================================

async function handleMethod(
  handler: MCPHandler,
  request: JSONRPCRequest,
  corsHeaders: Record<string, string>,
  rateLimitResult?: RateLimitResult | null
): Promise<Response> {
  const { id, method, params = {} } = request

  const headersWithRateLimit = rateLimitResult
    ? addRateLimitHeaders(corsHeaders, rateLimitResult)
    : corsHeaders

  try {
    switch (method) {
      case 'initialize': {
        const result = handler.initialize(params as unknown as InitializeParams)
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'initialized': {
        handler.initialized()
        return createSuccessResponse(id, {}, headersWithRateLimit)
      }

      case 'ping': {
        const result = handler.ping()
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'tools/list': {
        const result = handler.listTools()
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'tools/call': {
        const toolParams = params as unknown as CallToolParams
        const toolName = toolParams.name

        if (requiresStreaming(toolName) && handler.toolRequiresStreaming(toolName)) {
          const generator = handler.callToolStreaming(toolParams)
          return handler.createStreamingHttpResponse(generator, {
            requestId: id,
            corsHeaders: headersWithRateLimit,
          })
        }

        const result = await handler.callTool(toolParams)
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'resources/list': {
        const result = handler.listResources()
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'resources/read': {
        const result = await handler.readResource(params as unknown as ReadResourceParams)
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'prompts/list': {
        const result = handler.listPrompts()
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      case 'prompts/get': {
        const result = await handler.getPrompt(params as unknown as GetPromptParams)
        return createSuccessResponse(id, result, headersWithRateLimit)
      }

      default:
        return createErrorResponse(
          id,
          JSONRPCErrorCodes.METHOD_NOT_FOUND,
          `Method not found: ${method}`,
          headersWithRateLimit
        )
    }
  } catch (error) {
    if (error instanceof MCPProtocolError) {
      return createErrorResponse(id, error.code, error.message, headersWithRateLimit)
    }
    throw error
  }
}

// =============================================================================
// Response Helpers
// =============================================================================

function createSuccessResponse(
  id: string | number,
  result: unknown,
  corsHeaders: Record<string, string>
): Response {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id,
    result,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  corsHeaders: Record<string, string>
): Response {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message },
  }

  let status = 500
  if (code === JSONRPCErrorCodes.INVALID_REQUEST || code === JSONRPCErrorCodes.PARSE_ERROR) {
    status = 400
  } else if (code === JSONRPCErrorCodes.METHOD_NOT_FOUND) {
    status = 404
  } else if (code === JSONRPCErrorCodes.AUTHENTICATION_REQUIRED) {
    status = 401
  } else if (code === JSONRPCErrorCodes.AUTHORIZATION_FAILED) {
    status = 403
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

// =============================================================================
// Validation Helpers
// =============================================================================

function isValidJSONRPCRequest(body: unknown): body is JSONRPCRequest {
  if (typeof body !== 'object' || body === null) {
    return false
  }

  const obj = body as Record<string, unknown>

  return (
    obj.jsonrpc === '2.0' &&
    (typeof obj.id === 'string' || typeof obj.id === 'number') &&
    typeof obj.method === 'string'
  )
}
